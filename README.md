# 🗺️ Google Maps Deep Business Scraper

A production-grade Python scraper that extracts comprehensive business data from Google Maps using a **3-layer architecture**:

1. **Playwright** — Browser automation for Maps search, scrolling, and detail extraction
2. **BeautifulSoup** — Website crawling for email discovery
3. **Regex + phonenumbers + geopy** — Data parsing, phone formatting, and geocoding

## 📦 Installation

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium
```

## 🚀 Usage

### Basic Search
```bash
python gmaps_scraper.py --city "Lahore" --category "restaurants"
```

### With Options
```bash
# Limit to 50 results
python gmaps_scraper.py --city "New York" --category "dentists" --max-results 50

# Headless mode (no browser window)
python gmaps_scraper.py --city "London" --category "doctors" --headless

# Skip email extraction (faster)
python gmaps_scraper.py --city "Dubai" --category "hotels" --no-emails

# Custom output file
python gmaps_scraper.py --city "Karachi" --category "clinics" --output my_data.json

# Debug mode (verbose logging)
python gmaps_scraper.py --city "Islamabad" --category "gyms" --debug
```

## 📊 Output Format

The scraper outputs a JSON file in the `output/` directory:

```json
{
  "metadata": {
    "city": "Lahore",
    "category": "restaurants",
    "total_businesses": 127,
    "total_with_email": 45,
    "total_with_phone": 120,
    "total_with_website": 89
  },
  "businesses": [
    {
      "business_name": "Cafe Zouk",
      "category": "Restaurant",
      "sub_category": "Pakistani, Fine Dining",
      "business_email": "info@cafezouk.com",
      "owner_email": "ahmed@cafezouk.com",
      "phone_number": "+924235761234",
      "phone_number_local": "(042) 3576-1234",
      "website_url": "https://cafezouk.com",
      "full_address": "8-C, MM Alam Road, Gulberg III, Lahore",
      "latitude": 31.5204,
      "longitude": 74.3587,
      "opening_hours": {"Monday": "12 PM – 1 AM", "...": "..."},
      "is_currently_open": true,
      "rating": 4.3,
      "review_count": 12847,
      "reviews": [{"reviewer_name": "Ahmed", "rating": 5, "text": "Amazing!"}],
      "google_maps_url": "https://maps.google.com/...",
      "scraped_at": "2026-07-30T19:35:22"
    }
  ]
}
```

## 📁 Project Structure

```
├── gmaps_scraper.py          # CLI entry point
├── config.py                 # All settings, selectors, and patterns
├── scraper/
│   ├── maps_browser.py       # Playwright Google Maps automation
│   ├── email_crawler.py      # Website email extraction
│   ├── data_enricher.py      # Phone formatting + geocoding
│   └── models.py             # Pydantic data models
├── output/                   # Generated JSON files
├── requirements.txt          # Dependencies
└── README.md                 # This file
```

## ⚙️ Configuration

Edit `config.py` to customize:
- **Timing**: Scroll delays, page load waits (anti-detection)
- **Limits**: Max results, max reviews per business
- **Selectors**: CSS selectors (update if Google changes their DOM)
- **Proxy**: Set `PROXY_SERVER` environment variable for proxy rotation

## ⚠️ Disclaimer

This tool is for **educational purposes**. Review Google's Terms of Service before use. Use responsibly with appropriate delays to avoid overwhelming servers.
