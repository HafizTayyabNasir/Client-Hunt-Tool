"""
config.py — Central Configuration for Google Maps Scraper
All selectors, timing, regex patterns, and settings in one place.
"""

import os
from pathlib import Path

# ──────────────────────────────────────────────────────────────
# PATHS
# ──────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.resolve()
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

# ──────────────────────────────────────────────────────────────
# GOOGLE MAPS URLs
# ──────────────────────────────────────────────────────────────
MAPS_SEARCH_URL = "https://www.google.com/maps/search/{query}"

# ──────────────────────────────────────────────────────────────
# BROWSER SETTINGS
# ──────────────────────────────────────────────────────────────
BROWSER_CONFIG = {
    "headless": False,                     # Set True for invisible browser
    "slow_mo": 50,                         # Milliseconds between Playwright actions
    "viewport": {"width": 1366, "height": 900},
    "user_agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "locale": "en-US",
    "timezone_id": "America/New_York",
}

# Optional proxy — set to None to disable
# Example: "http://user:pass@proxy.example.com:8080"
PROXY_SERVER = os.environ.get("SCRAPER_PROXY", None)

# ──────────────────────────────────────────────────────────────
# TIMING (seconds) — randomized within range to appear human
# ──────────────────────────────────────────────────────────────
SCROLL_DELAY_MIN = 1.5
SCROLL_DELAY_MAX = 3.0
PAGE_LOAD_WAIT = 3.0
DETAIL_PANEL_WAIT = 2.0
CLICK_DELAY_MIN = 0.8
CLICK_DELAY_MAX = 2.0
BETWEEN_BUSINESSES_MIN = 1.0
BETWEEN_BUSINESSES_MAX = 2.5
WEBSITE_CRAWL_DELAY = 1.0               # Delay between website requests
MAX_WEBSITE_TIMEOUT = 10                 # Seconds before giving up on a website

# ──────────────────────────────────────────────────────────────
# SCRAPING LIMITS
# ──────────────────────────────────────────────────────────────
MAX_SCROLL_RETRIES = 5                   # Stop scrolling after N retries with no new results
MAX_REVIEWS_PER_BUSINESS = 10            # Number of review texts to extract
AUTO_SAVE_INTERVAL = 20                  # Save progress every N businesses
MAX_RESULTS = None                       # None = unlimited; set int to cap results

# ──────────────────────────────────────────────────────────────
# CSS SELECTORS — Google Maps (updated July 2026)
# These may need updating if Google changes their DOM structure
# ──────────────────────────────────────────────────────────────
SELECTORS = {
    # ── Search Results Feed ──
    "results_feed": 'div[role="feed"]',
    "business_card": 'div[role="feed"] > div > div > a',
    "end_of_list": 'span.HlvSq',
    "end_of_list_text": "You've reached the end of the list",

    # ── Detail Panel (right side / expanded view) ──
    "business_name": 'h1',
    "category": 'button[jsaction*="pane.rating.category"]',
    "category_fallback": 'button[jsaction*="category"] span',
    "category_container": '[class*="fontBodyMedium"] span[class*="DkEaL"]',

    # ── Contact Info ──
    "phone_button": 'button[data-item-id*="phone"]',
    "phone_text": 'button[data-item-id*="phone"] .Io6YTe, button[data-item-id*="phone"] .rogA2c',
    "website_link": 'a[data-item-id="authority"]',
    "address_button": 'button[data-item-id="address"]',
    "address_text": 'button[data-item-id="address"] .Io6YTe, button[data-item-id="address"] .rogA2c',

    # ── Ratings ──
    "rating_value": 'div.F7nice span[aria-hidden="true"]',
    "review_count": 'span[aria-label*="review"]',

    # ── Hours ──
    "hours_button": 'button[data-item-id*="hour"], button[aria-label*="hour"]',
    "hours_table": 'table.eK4R0e, table[class*="hours"]',
    "hours_row": 'tr',
    "hours_day": 'td:first-child',
    "hours_time": 'td:last-child ul li, td:last-child',
    "open_closed_indicator": 'span[class*="ZDu9vd"], span[class*="oCkgpc"]',

    # ── Reviews Tab ──
    "reviews_tab": 'button[aria-label*="Reviews"], button[data-tab-index="1"]',
    "review_card": 'div[data-review-id], div[class*="jftiEf"]',
    "review_author": 'div[class*="d4r55"] span, button[class*="WNxzHc"] > div',
    "review_rating": 'span[role="img"][aria-label*="star"]',
    "review_text": 'span[class*="wiI7pd"]',
    "review_date": 'span[class*="rsqaWe"]',
    "review_more_button": 'button[aria-label="See more"], button.w8nwRe',

    # ── Navigation / Consent ──
    "consent_accept": 'button[aria-label="Accept all"], form[action*="consent"] button',
    "back_button": 'button[aria-label="Back"], button[jsaction*="back"]',
}

# ──────────────────────────────────────────────────────────────
# REGEX PATTERNS
# ──────────────────────────────────────────────────────────────
EMAIL_REGEX = r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}'

# Emails to SKIP (generic/noreply)
EMAIL_BLACKLIST_PATTERNS = [
    r'noreply@',
    r'no-reply@',
    r'donotreply@',
    r'mailer-daemon@',
    r'.*@sentry\.io',
    r'.*@wixpress\.com',
    r'.*@example\.com',
    r'.*\.png$',
    r'.*\.jpg$',
    r'.*\.gif$',
    r'.*\.svg$',
    r'.*\.webp$',
    r'.*\.css$',
    r'.*\.js$',
]

# Patterns suggesting "business" email vs personal
BUSINESS_EMAIL_PREFIXES = [
    'info', 'contact', 'hello', 'support', 'sales', 'admin',
    'office', 'enquiry', 'inquiry', 'mail', 'help', 'service',
    'booking', 'reservations', 'team', 'general', 'reception',
]

# ──────────────────────────────────────────────────────────────
# WEBSITE CRAWL PATHS — pages to check for emails
# ──────────────────────────────────────────────────────────────
WEBSITE_EMAIL_PAGES = [
    '',                   # Homepage
    '/contact',
    '/contact-us',
    '/contact_us',
    '/contactus',
    '/contact/',
    '/contact-us/',
    '/about',
    '/about-us',
    '/about_us',
    '/aboutus',
    '/about/',
    '/about-us/',
    '/team',
    '/our-team',
    '/our_team',
    '/staff',
    '/doctors',
    '/physicians',
    '/providers',
    '/reach-us',
    '/get-in-touch',
    '/location',
    '/locations',
]

# ──────────────────────────────────────────────────────────────
# PHONE NUMBER DEFAULTS
# ──────────────────────────────────────────────────────────────
DEFAULT_COUNTRY_CODE = "PK"              # Default country for phone parsing
COUNTRY_CODE_MAP = {
    "pakistan": "PK",
    "india": "IN",
    "united states": "US",
    "usa": "US",
    "united kingdom": "GB",
    "uk": "GB",
    "canada": "CA",
    "australia": "AU",
    "uae": "AE",
    "germany": "DE",
    "france": "FR",
    "saudi arabia": "SA",
    "turkey": "TR",
    "china": "CN",
    "japan": "JP",
    "south korea": "KR",
    "brazil": "BR",
    "mexico": "MX",
    "italy": "IT",
    "spain": "ES",
    "netherlands": "NL",
    "sweden": "SE",
    "norway": "NO",
    "denmark": "DK",
    "singapore": "SG",
    "malaysia": "MY",
    "indonesia": "ID",
    "thailand": "TH",
    "philippines": "PH",
    "bangladesh": "BD",
    "sri lanka": "LK",
    "nepal": "NP",
    "new zealand": "NZ",
    "south africa": "ZA",
    "nigeria": "NG",
    "kenya": "KE",
    "egypt": "EG",
    "qatar": "QA",
    "bahrain": "BH",
    "kuwait": "KW",
    "oman": "OM",
    "jordan": "JO",
    "lebanon": "LB",
    "iraq": "IQ",
    "iran": "IR",
    "afghanistan": "AF",
}
