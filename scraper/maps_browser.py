"""
maps_browser.py — Layer 1: Playwright Google Maps Automation (FAST v3)
Key optimizations:
- Multi-tab concurrent extraction (5 tabs by default)
- Zero slow_mo, blocked images/fonts/media
- asyncio.gather for parallel DOM reads within each page
- No-click hours extraction (aria-label)
- Reviews optional / separate pass
"""
from __future__ import annotations
import asyncio, random, re, logging
from typing import Optional
from playwright.async_api import async_playwright, Page, Browser, BrowserContext
from playwright_stealth import Stealth
from scraper.models import BusinessData, ReviewData
from config import (
    MAPS_SEARCH_URL, BROWSER_CONFIG, PROXY_SERVER, SELECTORS,
    SCROLL_DELAY_MIN, SCROLL_DELAY_MAX, PAGE_LOAD_WAIT,
    MAX_SCROLL_RETRIES, MAX_REVIEWS_PER_BUSINESS, MAX_RESULTS,
)

logger = logging.getLogger(__name__)

# Number of concurrent browser tabs for detail extraction
NUM_WORKERS = 3


def _rand(lo: float, hi: float) -> float:
    return random.uniform(lo, hi)


class MapsBrowser:
    """Playwright-based Google Maps scraper engine with multi-tab concurrency."""

    def __init__(self, headless: bool = False, max_results: Optional[int] = None):
        self.headless = headless
        self.max_results = max_results or MAX_RESULTS
        self._pw = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None  # Main page for search/scroll
        self._stealth = None

    async def launch(self):
        """Launch the browser with stealth settings and aggressive optimizations."""
        self._pw = await async_playwright().start()
        launch_args = {
            "headless": self.headless,
            "slow_mo": 0,
            "args": [
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
            ],
        }
        if PROXY_SERVER:
            launch_args["proxy"] = {"server": PROXY_SERVER}

        self._browser = await self._pw.chromium.launch(**launch_args)
        self._context = await self._browser.new_context(
            viewport=BROWSER_CONFIG["viewport"],
            user_agent=BROWSER_CONFIG["user_agent"],
            locale=BROWSER_CONFIG["locale"],
            timezone_id=BROWSER_CONFIG["timezone_id"],
            permissions=["geolocation"],
        )

        # Block heavy resources to speed up page loads
        await self._context.route(
            "**/*.{png,jpg,jpeg,gif,svg,webp,ico,woff,woff2,ttf,eot,mp4,webm,ogg}",
            lambda route: route.abort()
        )

        self._page = await self._context.new_page()
        self._stealth = Stealth()
        await self._stealth.apply_stealth_async(self._page)
        logger.info("Browser launched with stealth mode (fast, multi-tab)")

    async def close(self):
        if self._browser:
            await self._browser.close()
        if self._pw:
            await self._pw.stop()
        logger.info("Browser closed")

    # ──────────────────────────────────────────────────────────
    # PHASE 1: Search + Infinite Scroll
    # ──────────────────────────────────────────────────────────
    async def search_and_scroll(self, city: str, category: str) -> list[str]:
        """Search Google Maps and scroll through ALL results. Returns URL list."""
        query = f"{category} in {city}"
        url = MAPS_SEARCH_URL.format(query=query.replace(" ", "+"))
        page = self._page

        logger.info(f"Navigating to: {url}")
        for attempt in range(2):
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                break
            except Exception as e:
                if attempt == 1:
                    raise e
                logger.warning(f"Initial navigation retry due to: {e}")
                await asyncio.sleep(2)
        await asyncio.sleep(PAGE_LOAD_WAIT)

        await self._handle_consent()
        await asyncio.sleep(1)

        try:
            await page.wait_for_selector(SELECTORS["results_feed"], timeout=15000)
        except Exception:
            logger.warning("Results feed not found, trying alternative wait...")
            await asyncio.sleep(3)

        business_urls = await self._scroll_all_results()
        logger.info(f"Found {len(business_urls)} businesses after scrolling")
        return business_urls

    async def _handle_consent(self):
        page = self._page
        try:
            consent = page.locator(SELECTORS["consent_accept"]).first
            if await consent.is_visible(timeout=2000):
                await consent.click()
                await asyncio.sleep(1)
                logger.info("Accepted consent dialog")
        except Exception:
            pass

    async def _scroll_all_results(self) -> list[str]:
        """Scroll feed until all results loaded."""
        page = self._page
        sel = SELECTORS
        all_urls: list[str] = []
        no_new_count = 0

        while True:
            cards = await page.query_selector_all(sel["business_card"])
            current_urls = []
            for card in cards:
                href = await card.get_attribute("href")
                if href and "/maps/place/" in href:
                    current_urls.append(href)

            new_count = len(current_urls) - len(all_urls)
            if new_count > 0:
                all_urls = current_urls
                no_new_count = 0
                logger.info(f"  Loaded {len(all_urls)} businesses so far...")
            else:
                no_new_count += 1

            if self.max_results and len(all_urls) >= self.max_results:
                all_urls = all_urls[:self.max_results]
                logger.info(f"Reached max results limit: {self.max_results}")
                break

            if no_new_count >= MAX_SCROLL_RETRIES:
                logger.info("No new results after retries -- end of list")
                break

            try:
                end_el = await page.query_selector(sel["end_of_list"])
                if end_el:
                    end_text = await end_el.inner_text()
                    if sel["end_of_list_text"].lower() in end_text.lower():
                        logger.info("Reached end-of-list marker")
                        break
            except Exception:
                pass

            await page.evaluate("""
                () => {
                    const feed = document.querySelector('div[role="feed"]');
                    if (feed) feed.scrollTo(0, feed.scrollHeight);
                }
            """)
            await asyncio.sleep(_rand(SCROLL_DELAY_MIN, SCROLL_DELAY_MAX))

        return all_urls

    # ──────────────────────────────────────────────────────────
    # PHASE 2: Multi-tab concurrent extraction
    # ──────────────────────────────────────────────────────────
    async def extract_all_concurrent(
        self,
        urls: list[str],
        on_progress=None,
        num_workers: int = NUM_WORKERS,
    ) -> list[BusinessData]:
        """
        Extract business details from multiple URLs concurrently
        using a pool of browser tabs (workers) with retry support.
        
        on_progress: callback(completed_count, total, biz_data_or_none)
        """
        total = len(urls)
        results: list[Optional[BusinessData]] = [None] * total
        url_queue: asyncio.Queue[tuple[int, str, int]] = asyncio.Queue()  # (idx, url, attempt)

        for idx, url in enumerate(urls):
            await url_queue.put((idx, url, 0))

        # Create worker tabs
        actual_workers = min(num_workers, total)
        worker_pages: list[Page] = []
        for i in range(actual_workers):
            p = await self._context.new_page()
            await self._stealth.apply_stealth_async(p)
            worker_pages.append(p)

        completed = 0
        lock = asyncio.Lock()

        async def worker(page: Page, worker_id: int):
            nonlocal completed
            # Stagger start so all tabs don't hit Google simultaneously
            await asyncio.sleep(worker_id * 0.5)

            while not url_queue.empty():
                try:
                    idx, url, attempt = url_queue.get_nowait()
                except asyncio.QueueEmpty:
                    break

                biz_data = await self._extract_on_page(page, url)

                if not biz_data or not biz_data.business_name:
                    # Retry once with a small delay
                    if attempt < 1:
                        await asyncio.sleep(_rand(0.5, 1.0))
                        await url_queue.put((idx, url, attempt + 1))
                        continue

                results[idx] = biz_data

                async with lock:
                    completed += 1
                    if on_progress:
                        on_progress(completed, total, biz_data)

                # Small delay between navigations to appear human
                await asyncio.sleep(_rand(0.3, 0.8))

        # Run all workers concurrently
        await asyncio.gather(*[
            worker(page, i) for i, page in enumerate(worker_pages)
        ])

        # Close worker tabs
        for p in worker_pages:
            try:
                await p.close()
            except Exception:
                pass

        return [r for r in results if r is not None and r.business_name]

    async def _extract_on_page(self, page: Page, maps_url: str) -> Optional[BusinessData]:
        """Navigate to a business page and extract all detail fields on the given page."""
        try:
            await page.goto(maps_url, wait_until="domcontentloaded", timeout=15000)
        except Exception as e:
            logger.debug(f"Failed to load: {maps_url} -- {e}")
            return None

        # Wait for h1
        try:
            await page.wait_for_selector('h1', timeout=4000)
        except Exception:
            await asyncio.sleep(0.3)

        data = BusinessData()
        data.google_maps_url = maps_url

        try:
            results = await asyncio.gather(
                self._get_text(page, 'h1'),
                self._get_text(page, SELECTORS["phone_text"]),
                self._get_attr(page, SELECTORS["website_link"], "href"),
                self._get_text(page, SELECTORS["address_text"]),
                self._get_text(page, SELECTORS["rating_value"]),
                self._get_review_count(page),
                self._get_categories_fast(page),
                self._get_hours_fast(page),
                self._get_open_status(page),
                return_exceptions=True,
            )

            name, phone, website, address, rating_raw, review_count, categories, hours, open_status = [
                r if not isinstance(r, Exception) else None for r in results
            ]

            data.business_name = name or ""
            if not data.business_name:
                return None

            data.phone_number = phone
            data.website_url = website
            data.full_address = address or ""

            if rating_raw:
                try:
                    data.rating = round(float(str(rating_raw).replace(",", ".")), 1)
                except ValueError:
                    pass

            data.review_count = review_count

            if categories:
                data.category = categories[0]
                data.sub_category = categories[1]

            data.opening_hours = hours or {}
            data.is_currently_open = open_status

            # Lat/long from current URL
            current_url = page.url
            coords = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', current_url)
            if coords:
                try:
                    data.latitude = round(float(coords.group(1)), 6)
                    data.longitude = round(float(coords.group(2)), 6)
                except ValueError:
                    pass

            if not data.latitude:
                coords2 = re.search(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', maps_url)
                if coords2:
                    data.latitude = round(float(coords2.group(1)), 6)
                    data.longitude = round(float(coords2.group(2)), 6)

            cid = re.search(r'0x[\da-f]+:0x[\da-f]+', current_url)
            if cid:
                data.place_id = cid.group(0)

            return data

        except Exception as e:
            logger.debug(f"Extraction error: {e}")
            return None

    # ──────────────────────────────────────────────────────────
    # Backward compat: single-page extraction
    # ──────────────────────────────────────────────────────────
    async def extract_business_detail(self, maps_url: str) -> Optional[BusinessData]:
        """Single-page extraction (fallback)."""
        return await self._extract_on_page(self._page, maps_url)

    # ──────────────────────────────────────────────────────────
    # FAST HELPER METHODS
    # ──────────────────────────────────────────────────────────
    async def _get_text(self, page: Page, selector: str) -> Optional[str]:
        el = await page.query_selector(selector)
        if el:
            return (await el.inner_text()).strip()
        return None

    async def _get_attr(self, page: Page, selector: str, attr: str) -> Optional[str]:
        el = await page.query_selector(selector)
        if el:
            return await el.get_attribute(attr)
        return None

    async def _get_review_count(self, page: Page) -> Optional[int]:
        el = await page.query_selector(SELECTORS["review_count"])
        if el:
            label = await el.get_attribute("aria-label") or await el.inner_text()
            digits = re.sub(r'[^\d]', '', label)
            if digits:
                return int(digits)
        return None

    async def _get_categories_fast(self, page: Page) -> tuple[str, str]:
        category = ""
        sub_category = ""

        cat_el = await page.query_selector(SELECTORS["category"])
        if cat_el:
            category = (await cat_el.inner_text()).strip()
        else:
            cat_el = await page.query_selector(SELECTORS["category_fallback"])
            if cat_el:
                category = (await cat_el.inner_text()).strip()

        if not category:
            cat_buttons = await page.query_selector_all('button[jsaction*="category"]')
            cats = []
            for btn in cat_buttons:
                txt = (await btn.inner_text()).strip()
                if txt and len(txt) < 80:
                    cats.append(txt)
            if cats:
                category = cats[0]
                if len(cats) > 1:
                    sub_category = ", ".join(cats[1:])

        if not category:
            cat_container = await page.query_selector(SELECTORS["category_container"])
            if cat_container:
                full_text = (await cat_container.inner_text()).strip()
                parts = [p.strip() for p in full_text.split("\u00b7")]
                if len(parts) > 1:
                    category = parts[0]
                    sub_category = ", ".join(parts[1:])
                elif full_text:
                    category = full_text

        return (category, sub_category)

    async def _get_hours_fast(self, page: Page) -> dict[str, str]:
        """Extract hours from aria-label (no click needed)."""
        hours = {}
        valid_days = {'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'}
        try:
            hours_btn = await page.query_selector(SELECTORS["hours_button"])
            if hours_btn:
                label = await hours_btn.get_attribute("aria-label")
                if label:
                    label_clean = label
                    for noise in ["Hours:", "Copy open hours", "Hide open hours",
                                  "Show open hours", "\u202f", "\u00a0"]:
                        label_clean = label_clean.replace(noise, " ")
                    label_clean = re.sub(r'\s+', ' ', label_clean).strip()

                    if ";" in label_clean:
                        for part in label_clean.split(";"):
                            part = part.strip().rstrip(".")
                            if "," in part:
                                day, time_str = part.split(",", 1)
                                day = day.strip()
                                time_str = time_str.strip()
                                if day.lower() in valid_days and time_str:
                                    hours[day] = time_str
                    elif "," in label_clean:
                        day, time_str = label_clean.split(",", 1)
                        day = day.strip()
                        time_str = time_str.strip()
                        if day.lower() in valid_days and time_str:
                            hours[day] = time_str

            if not hours:
                table = await page.query_selector(SELECTORS["hours_table"])
                if table:
                    rows = await table.query_selector_all('tr')
                    for row in rows:
                        cells = await row.query_selector_all('td')
                        if len(cells) >= 2:
                            day = (await cells[0].inner_text()).strip()
                            time_text = (await cells[1].inner_text()).strip()
                            if day:
                                hours[day] = time_text
        except Exception:
            pass
        return hours

    async def _get_open_status(self, page: Page) -> Optional[bool]:
        el = await page.query_selector(SELECTORS["open_closed_indicator"])
        if el:
            text = (await el.inner_text()).strip().lower()
            return "open" in text
        return None

    # ──────────────────────────────────────────────────────────
    # OPTIONAL: Review extraction (slower, opt-in)
    # ──────────────────────────────────────────────────────────
    async def extract_reviews_for_business(self, maps_url: str) -> list[ReviewData]:
        page = self._page
        reviews = []
        try:
            await page.goto(maps_url, wait_until="domcontentloaded", timeout=10000)
            await asyncio.sleep(0.5)

            tab = await page.query_selector(SELECTORS["reviews_tab"])
            if not tab:
                return reviews
            await tab.click()
            await asyncio.sleep(1)

            try:
                await page.wait_for_selector(SELECTORS["review_card"], timeout=4000)
            except Exception:
                return reviews

            more_btns = await page.query_selector_all(SELECTORS["review_more_button"])
            for btn in more_btns[:MAX_REVIEWS_PER_BUSINESS]:
                try:
                    await btn.click()
                    await asyncio.sleep(0.15)
                except Exception:
                    pass

            cards = await page.query_selector_all(SELECTORS["review_card"])
            for card in cards[:MAX_REVIEWS_PER_BUSINESS]:
                review = ReviewData()
                try:
                    author = await card.query_selector(SELECTORS["review_author"])
                    if author:
                        review.reviewer_name = (await author.inner_text()).strip()
                except Exception:
                    pass
                try:
                    rating_el = await card.query_selector(SELECTORS["review_rating"])
                    if rating_el:
                        lbl = await rating_el.get_attribute("aria-label") or ""
                        m = re.search(r'(\d)', lbl)
                        if m:
                            review.rating = int(m.group(1))
                except Exception:
                    pass
                try:
                    text_el = await card.query_selector(SELECTORS["review_text"])
                    if text_el:
                        review.text = (await text_el.inner_text()).strip()
                except Exception:
                    pass
                try:
                    date_el = await card.query_selector(SELECTORS["review_date"])
                    if date_el:
                        review.date = (await date_el.inner_text()).strip()
                except Exception:
                    pass
                if review.text or review.reviewer_name:
                    reviews.append(review)
        except Exception as e:
            logger.debug(f"Review extraction error: {e}")
        return reviews
