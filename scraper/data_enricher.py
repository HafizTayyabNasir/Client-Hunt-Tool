"""
data_enricher.py — Layer 3: Data Enrichment
Phone number formatting, geocoding, and data validation.
"""
from __future__ import annotations
import re, logging
from typing import Optional
import phonenumbers
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut
from config import DEFAULT_COUNTRY_CODE, COUNTRY_CODE_MAP

logger = logging.getLogger(__name__)

class DataEnricher:
    def __init__(self, city: str = ""):
        self.city = city.lower().strip()
        self.country_code = self._detect_country(self.city)
        self._geocoder = Nominatim(user_agent="gmaps_business_scraper_v1", timeout=10)

    def _detect_country(self, city: str) -> str:
        """Detect country code from city name heuristics."""
        for country_name, code in COUNTRY_CODE_MAP.items():
            if country_name in city:
                return code
        # Try common city → country mappings
        city_map = {
            "lahore": "PK", "karachi": "PK", "islamabad": "PK", "rawalpindi": "PK",
            "faisalabad": "PK", "multan": "PK", "peshawar": "PK", "quetta": "PK",
            "new york": "US", "los angeles": "US", "chicago": "US", "houston": "US",
            "london": "GB", "manchester": "GB", "birmingham": "GB", "liverpool": "GB",
            "toronto": "CA", "vancouver": "CA", "montreal": "CA",
            "sydney": "AU", "melbourne": "AU", "brisbane": "AU",
            "dubai": "AE", "abu dhabi": "AE", "sharjah": "AE",
            "mumbai": "IN", "delhi": "IN", "bangalore": "IN", "hyderabad": "IN",
            "riyadh": "SA", "jeddah": "SA", "mecca": "SA",
            "istanbul": "TR", "ankara": "TR",
            "berlin": "DE", "munich": "DE", "hamburg": "DE",
            "paris": "FR", "lyon": "FR", "marseille": "FR",
            "tokyo": "JP", "osaka": "JP",
            "beijing": "CN", "shanghai": "CN",
            "singapore": "SG",
            "kuala lumpur": "MY",
            "bangkok": "TH", "jakarta": "ID",
        }
        return city_map.get(city, DEFAULT_COUNTRY_CODE)

    def format_phone(self, raw_phone: str) -> dict[str, Optional[str]]:
        """Format a raw phone string into international and local formats."""
        if not raw_phone:
            return {"international": None, "local": None}
        # Clean the raw string
        cleaned = re.sub(r'[^\d+\-() ]', '', raw_phone.strip())
        if not cleaned:
            return {"international": None, "local": None}
        try:
            parsed = phonenumbers.parse(cleaned, self.country_code)
            if phonenumbers.is_valid_number(parsed):
                intl = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
                local = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.NATIONAL)
                return {"international": intl, "local": local}
        except phonenumbers.NumberParseException:
            pass
        # Fallback: try with + prefix
        if not cleaned.startswith("+"):
            try:
                parsed = phonenumbers.parse("+" + cleaned, None)
                if phonenumbers.is_valid_number(parsed):
                    intl = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
                    local = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.NATIONAL)
                    return {"international": intl, "local": local}
            except phonenumbers.NumberParseException:
                pass
        return {"international": cleaned, "local": cleaned}

    def geocode_address(self, address: str) -> dict[str, Optional[float]]:
        """Geocode an address to latitude/longitude using Nominatim."""
        if not address:
            return {"latitude": None, "longitude": None}
        try:
            location = self._geocoder.geocode(address)
            if location:
                return {"latitude": round(location.latitude, 6), "longitude": round(location.longitude, 6)}
        except GeocoderTimedOut:
            logger.debug(f"Geocoding timeout for: {address}")
        except Exception as e:
            logger.debug(f"Geocoding error for {address}: {e}")
        return {"latitude": None, "longitude": None}

    def parse_coords_from_url(self, url: str) -> dict[str, Optional[float]]:
        """Extract lat/long from a Google Maps URL containing @lat,lng,zoom."""
        if not url:
            return {"latitude": None, "longitude": None}
        match = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', url)
        if match:
            try:
                return {
                    "latitude": round(float(match.group(1)), 6),
                    "longitude": round(float(match.group(2)), 6),
                }
            except ValueError:
                pass
        return {"latitude": None, "longitude": None}

    def clean_text(self, text: str) -> str:
        """Clean scraped text of HTML entities and extra whitespace."""
        if not text:
            return ""
        import html
        text = html.unescape(text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text
