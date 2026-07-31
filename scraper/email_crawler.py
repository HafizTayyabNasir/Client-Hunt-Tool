"""
email_crawler.py — Layer 2: Website Email Extraction (ASYNC v3.2)
Batch-crawls business websites using aiohttp + BeautifulSoup + regex.
Includes Cloudflare Email Protection Hex Decryption, 403 Stealth Headers,
Header/Footer targeted parsing, dynamic link discovery, and JS decoding.
"""
from __future__ import annotations
import asyncio, json, re, logging, html, socket
from typing import Optional, Callable
from urllib.parse import urljoin, urlparse, unquote

import aiohttp
from bs4 import BeautifulSoup

from config import (
    EMAIL_REGEX, EMAIL_BLACKLIST_PATTERNS, BUSINESS_EMAIL_PREFIXES,
    WEBSITE_EMAIL_PAGES, MAX_WEBSITE_TIMEOUT,
)

logger = logging.getLogger(__name__)

CONTACT_LINK_KEYWORDS = [
    'contact', 'about', 'team', 'staff', 'doctor', 'physician', 'provider',
    'location', 'reach', 'get-in-touch', 'help', 'connect', 'find-us', 'patient'
]

HEADER_FOOTER_SELECTORS = [
    'header', 'nav', 'footer',
    '[class*="header"]', '[class*="nav"]', '[class*="top-bar"]', '[class*="topbar"]',
    '[class*="footer"]', '[class*="bottom"]', '[class*="contact"]',
    '[id*="header"]', '[id*="nav"]', '[id*="footer"]', '[id*="contact"]'
]


def decode_cloudflare_email(cf_hex: str) -> Optional[str]:
    """Decodes Cloudflare email protection hex strings (e.g. data-cfemail or cdn-cgi link)."""
    try:
        if not cf_hex or len(cf_hex) < 4:
            return None
        r = int(cf_hex[:2], 16)
        email = ''.join([chr(int(cf_hex[i:i+2], 16) ^ r) for i in range(2, len(cf_hex), 2)])
        if re.match(EMAIL_REGEX, email):
            return email
    except Exception:
        pass
    return None


FB_IGNORE = {
    'sharer', 'share.php', 'sharer.php', 'dialog', 'tr', 'plugins', 'privacy',
    'terms', 'help', 'events', 'public', 'settings', 'policy', 'home.php', 'login.php',
    'group', 'groups', 'pages', 'watch'
}

IG_IGNORE = {
    'p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct', 'tv',
    'developer', 'about', 'legal', 'help'
}


class AsyncEmailCrawler:
    """Async crawler for batch processing emails, Facebook & Instagram profiles."""

    def __init__(self, max_concurrent: int = 25):
        self.max_concurrent = max_concurrent
        self._blacklist = [re.compile(p, re.IGNORECASE) for p in EMAIL_BLACKLIST_PATTERNS]
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if not self._session or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=MAX_WEBSITE_TIMEOUT)
            connector = aiohttp.TCPConnector(
                limit=self.max_concurrent,
                ssl=False,
                ttl_dns_cache=300,
                use_dns_cache=True,
                resolver=aiohttp.ThreadedResolver(),
            )
            self._session = aiohttp.ClientSession(
                timeout=timeout,
                connector=connector,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/131.0.0.0 Safari/537.36"
                    ),
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                    "Sec-Ch-Ua-Mobile": "?0",
                    "Sec-Ch-Ua-Platform": '"Windows"',
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-User": "?1",
                    "Upgrade-Insecure-Requests": "1",
                },
            )
        return self._session

    async def batch_extract(
        self,
        website_urls: list[Optional[str]],
        on_progress: Optional[Callable[[int, int, dict], None]] = None
    ) -> list[dict[str, Optional[str]]]:
        """
        Extract emails and social media profiles from multiple websites concurrently.
        Returns a list of dicts: {business_email, owner_email, facebook_url, instagram_url}
        """
        loop = asyncio.get_running_loop()
        old_handler = loop.get_exception_handler()

        def quiet_handler(lp, context):
            exc = context.get('exception')
            if isinstance(exc, (socket.gaierror, aiohttp.ClientError, OSError)):
                return
            if old_handler:
                old_handler(lp, context)
            else:
                lp.default_exception_handler(context)

        loop.set_exception_handler(quiet_handler)

        try:
            session = await self._get_session()
            total = len(website_urls)
            completed = 0
            results: list[Optional[dict[str, Optional[str]]]] = [None] * total
            lock = asyncio.Lock()

            async def worker(idx: int, url: Optional[str]):
                nonlocal completed
                res = await self._extract_one(session, url)
                results[idx] = res
                async with lock:
                    completed += 1
                    if on_progress:
                        on_progress(completed, total, res)

            tasks = [worker(i, url) for i, url in enumerate(website_urls)]
            await asyncio.gather(*tasks)
            return [r if r is not None else {"business_email": None, "owner_email": None, "facebook_url": None, "instagram_url": None} for r in results]
        finally:
            loop.set_exception_handler(old_handler)

    async def _extract_one(self, session: aiohttp.ClientSession, url: Optional[str]) -> dict[str, Optional[str]]:
        """Extract emails & social links from a single website."""
        empty_res = {"business_email": None, "owner_email": None, "facebook_url": None, "instagram_url": None}
        if not url:
            return empty_res

        url_clean = url.strip()
        if not url_clean.startswith(("http://", "https://")):
            url_clean = "https://" + url_clean

        parsed = urlparse(url_clean)
        if not parsed.netloc:
            return empty_res

        base_domain_url = f"{parsed.scheme}://{parsed.netloc}"

        async with self._semaphore:
            found_emails: set[str] = set()
            found_fb: set[str] = set()
            found_ig: set[str] = set()

            # Priority 1: exact landing page
            urls_to_visit = [url_clean]

            # Priority 2: homepage
            if base_domain_url.rstrip('/') != url_clean.rstrip('/'):
                urls_to_visit.append(base_domain_url)

            # Priority 3: HTTP fallback for non-SSL sites
            if url_clean.startswith("https://"):
                urls_to_visit.append(url_clean.replace("https://", "http://", 1))
                urls_to_visit.append(base_domain_url.replace("https://", "http://", 1))

            # Priority 4: configured WEBSITE_EMAIL_PAGES
            for path in WEBSITE_EMAIL_PAGES:
                if path:
                    urls_to_visit.append(urljoin(base_domain_url, path))

            # Deduplicate preserving order
            seen_urls = set()
            unique_urls = []
            for u in urls_to_visit:
                u_norm = u.rstrip('/')
                if u_norm not in seen_urls:
                    seen_urls.add(u_norm)
                    unique_urls.append(u)

            discovered_links: set[str] = set()

            # Limit initial subpage visits to 6 max per site
            for page_url in unique_urls[:6]:
                page_emails, page_links, page_fb, page_ig = await self._fetch_and_extract(session, page_url)
                found_emails.update(page_emails)
                discovered_links.update(page_links)
                found_fb.update(page_fb)
                found_ig.update(page_ig)

                valid_so_far = self._filter(found_emails)
                if len(valid_so_far) >= 2 and found_fb and found_ig:
                    break

            # If no emails found yet, crawl dynamically discovered links
            if not found_emails and discovered_links:
                for link_url in list(discovered_links)[:3]:
                    if link_url.rstrip('/') not in seen_urls:
                        page_emails, _, page_fb, page_ig = await self._fetch_and_extract(session, link_url)
                        found_emails.update(page_emails)
                        found_fb.update(page_fb)
                        found_ig.update(page_ig)
                        if found_emails:
                            break

            valid_emails = self._filter(found_emails)
            res = self._classify(valid_emails) if valid_emails else {"business_email": None, "owner_email": None}
            res["facebook_url"] = list(found_fb)[0] if found_fb else None
            res["instagram_url"] = list(found_ig)[0] if found_ig else None
            return res

    async def _fetch_and_extract(self, session: aiohttp.ClientSession, url: str) -> tuple[set[str], set[str], set[str], set[str]]:
        """Fetch a page and extract emails, links, Facebook URLs, and Instagram URLs."""
        emails: set[str] = set()
        links: set[str] = set()
        fb_urls: set[str] = set()
        ig_urls: set[str] = set()

        try:
            async with session.get(url, allow_redirects=True, ssl=False) as resp:
                if resp.status not in (200, 301, 302, 403):
                    return emails, links, fb_urls, ig_urls
                ct = resp.headers.get("content-type", "")
                if "text/html" not in ct and "xhtml" not in ct and ct != "":
                    return emails, links, fb_urls, ig_urls
                raw_html = await resp.text(errors="replace")

            # 1. Cloudflare Email Decryption (data-cfemail & cdn-cgi links)
            for cf_hex in re.findall(r'data-cfemail="([a-fA-F0-9]+)"', raw_html):
                decoded = decode_cloudflare_email(cf_hex)
                if decoded:
                    emails.add(decoded)

            for cf_hex in re.findall(r'email-protection#([a-fA-F0-9]+)', raw_html):
                decoded = decode_cloudflare_email(cf_hex)
                if decoded:
                    emails.add(decoded)

            # Decode HTML entities & percent-encoding
            html_decoded = unquote(html.unescape(raw_html))
            soup = BeautifulSoup(html_decoded, "lxml")

            # 2. Direct Regex match on body text
            body_text = soup.get_text(separator=" ")
            emails.update(re.findall(EMAIL_REGEX, body_text))

            # 3. Extract mailto: links across DOM
            for a in soup.select('a[href*="mailto:"]'):
                href = a.get("href", "")
                if "mailto:" in href:
                    em = href.split("mailto:")[1].split("?")[0].strip()
                    if re.match(EMAIL_REGEX, em):
                        emails.add(em)

            # 4. Targeted extraction from Navbar, Header, and Footer elements
            for selector in HEADER_FOOTER_SELECTORS:
                for el in soup.select(selector):
                    el_text = el.get_text(separator=" ")
                    emails.update(re.findall(EMAIL_REGEX, el_text))

                    for a in el.find_all('a', href=True):
                        if 'mailto:' in a['href']:
                            em = a['href'].split("mailto:")[1].split("?")[0].strip()
                            if re.match(EMAIL_REGEX, em):
                                emails.add(em)

                    for attr_name, attr_val in el.attrs.items():
                        if isinstance(attr_val, str) and re.match(EMAIL_REGEX, attr_val):
                            emails.add(attr_val)

            # 5. Form inputs, hidden fields, options, and data-attributes
            for tag in soup.find_all(['input', 'option', 'button', 'form']):
                for val in tag.attrs.values():
                    if isinstance(val, str) and re.match(EMAIL_REGEX, val):
                        emails.add(val)
                    elif isinstance(val, list):
                        for item in val:
                            if isinstance(item, str) and re.match(EMAIL_REGEX, item):
                                emails.add(item)

            # 6. Raw HTML Regex match (catches comments, meta tags, embedded scripts)
            emails.update(re.findall(EMAIL_REGEX, html_decoded))

            # 7. JSON-LD Metadata extraction
            for s in soup.select('script[type="application/ld+json"]'):
                try:
                    content = s.string or ""
                    if content:
                        self._extract_jsonld_emails(json.loads(content), emails)
                except Exception:
                    pass

            # 8. Decode Obfuscated Emails (e.g. info [at] domain.com, name (at) domain (dot) com)
            for tag in soup.find_all(['span', 'p', 'div', 'a', 'li', 'td', 'footer', 'header']):
                txt = tag.string or tag.get_text()
                if txt and ('at' in txt.lower() or '[at]' in txt.lower() or '(at)' in txt.lower()):
                    cleaned = txt
                    cleaned = re.sub(r'\s*\[\s*at\s*\]\s*', '@', cleaned, flags=re.IGNORECASE)
                    cleaned = re.sub(r'\s*\(\s*at\s*\)\s*', '@', cleaned, flags=re.IGNORECASE)
                    cleaned = re.sub(r'\s+at\s+', '@', cleaned, flags=re.IGNORECASE)
                    cleaned = re.sub(r'\s*\[\s*dot\s*\]\s*', '.', cleaned, flags=re.IGNORECASE)
                    cleaned = re.sub(r'\s*\(\s*dot\s*\)\s*', '.', cleaned, flags=re.IGNORECASE)
                    cleaned = re.sub(r'\s+dot\s+', '.', cleaned, flags=re.IGNORECASE)
                    matched = re.findall(EMAIL_REGEX, cleaned)
                    emails.update(matched)

            # 9. Dynamic Link Discovery from Navbar / Footer / Menu anchors
            base_parsed = urlparse(url)
            base_domain = f"{base_parsed.scheme}://{base_parsed.netloc}"

            for a in soup.find_all('a', href=True):
                href = a['href'].strip()
                href_lower = href.lower()
                text_lower = a.get_text().lower()

                # Dynamic contact link discovery
                if any(kw in href_lower or kw in text_lower for kw in CONTACT_LINK_KEYWORDS):
                    full_link = urljoin(base_domain, href)
                    if urlparse(full_link).netloc == base_parsed.netloc:
                        links.add(full_link)

                # Facebook profile link extraction
                if 'facebook.com' in href_lower or 'fb.com' in href_lower:
                    try:
                        parsed_fb = urlparse(href)
                        parts = [p for p in parsed_fb.path.split('/') if p]
                        if parts:
                            first_p = parts[0].lower()
                            if first_p not in FB_IGNORE and not first_p.startswith(('sharer', 'share')):
                                fb_urls.add(f"https://www.facebook.com/{parts[0]}")
                    except Exception:
                        pass

                # Instagram handle link extraction
                elif 'instagram.com' in href_lower or 'instagr.am' in href_lower:
                    try:
                        parsed_ig = urlparse(href)
                        parts = [p for p in parsed_ig.path.split('/') if p]
                        if parts:
                            first_p = parts[0].lower()
                            if first_p not in IG_IGNORE:
                                ig_urls.add(f"https://www.instagram.com/{parts[0]}")
                    except Exception:
                        pass

        except Exception:
            pass

        return emails, links, fb_urls, ig_urls

    def _extract_jsonld_emails(self, data, emails: set):
        if isinstance(data, dict):
            for k, v in data.items():
                if k.lower() in ("email", "contactpoint") and isinstance(v, str):
                    clean_v = html.unescape(v).strip()
                    if re.match(EMAIL_REGEX, clean_v):
                        emails.add(clean_v)
                else:
                    self._extract_jsonld_emails(v, emails)
        elif isinstance(data, list):
            for item in data:
                self._extract_jsonld_emails(item, emails)

    def _filter(self, emails: set[str]) -> list[str]:
        valid = []
        for e in emails:
            el = e.lower().strip()
            if len(el) < 6 or len(el) > 254:
                continue
            if any(p.match(el) for p in self._blacklist):
                continue
            if el.endswith(('.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js', '.pdf', '.zip')):
                continue
            valid.append(el)
        return list(dict.fromkeys(valid))

    def _classify(self, emails: list[str]) -> dict[str, Optional[str]]:
        biz = own = None
        for e in emails:
            local = e.split("@")[0].lower()
            if any(local.startswith(p) for p in BUSINESS_EMAIL_PREFIXES):
                if not biz:
                    biz = e
            else:
                if not own:
                    own = e

        # If no generic business email (e.g. info@) was found, use personal email as business_email
        # but set owner_email to None so it does not duplicate!
        if not biz and own:
            biz = own
            own = None
        elif biz == own:
            own = None

        return {"business_email": biz, "owner_email": own}

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()
