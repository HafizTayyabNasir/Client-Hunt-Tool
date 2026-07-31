"""
models.py — Pydantic Data Models for Google Maps Business Data
Defines the exact schema for scraped business data and JSON output.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class ReviewData(BaseModel):
    """A single Google Maps review."""
    reviewer_name: str = ""
    rating: Optional[int] = None
    text: str = ""
    date: str = ""

    @field_validator("text", mode="before")
    @classmethod
    def clean_text(cls, v: str) -> str:
        if v:
            return v.strip().replace("\n", " ").replace("\r", "")
        return ""


class BusinessData(BaseModel):
    """Complete data model for a single scraped business."""

    # ── Identity ──
    business_name: str = ""
    category: str = ""
    sub_category: str = ""

    # ── Contact ──
    business_email: Optional[str] = None
    owner_email: Optional[str] = None
    phone_number: Optional[str] = None          # E.164 international format
    phone_number_local: Optional[str] = None    # National format
    website_url: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None

    # ── Location ──
    full_address: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # ── Hours ──
    opening_hours: dict[str, str] = Field(default_factory=dict)
    holiday_hours: Optional[dict[str, str]] = None
    is_currently_open: Optional[bool] = None

    # ── Ratings & Reviews ──
    rating: Optional[float] = None
    review_count: Optional[int] = None
    reviews: list[ReviewData] = Field(default_factory=list)

    # ── Meta ──
    google_maps_url: str = ""
    place_id: Optional[str] = None
    scraped_at: str = Field(default_factory=lambda: datetime.now().isoformat())

    @field_validator("business_name", mode="before")
    @classmethod
    def clean_name(cls, v: str) -> str:
        if v:
            return v.strip()
        return ""

    @field_validator("rating", mode="before")
    @classmethod
    def parse_rating(cls, v) -> Optional[float]:
        if v is None:
            return None
        try:
            return round(float(str(v).replace(",", ".")), 1)
        except (ValueError, TypeError):
            return None

    @field_validator("review_count", mode="before")
    @classmethod
    def parse_review_count(cls, v) -> Optional[int]:
        if v is None:
            return None
        try:
            # Handle strings like "(1,234)" or "1234 reviews"
            import re
            cleaned = re.sub(r'[^\d]', '', str(v))
            return int(cleaned) if cleaned else None
        except (ValueError, TypeError):
            return None


class ScrapeMetadata(BaseModel):
    """Metadata about the scraping session."""
    city: str
    category: str
    total_businesses: int = 0
    total_with_email: int = 0
    total_with_phone: int = 0
    total_with_website: int = 0
    total_with_instagram: int = 0
    total_with_facebook: int = 0
    scrape_started: str = Field(default_factory=lambda: datetime.now().isoformat())
    scrape_completed: Optional[str] = None
    scraper_version: str = "2.0.0"


class ScrapeOutput(BaseModel):
    """Top-level output structure for the JSON file."""
    metadata: ScrapeMetadata
    businesses: list[BusinessData] = Field(default_factory=list)

    def compute_stats(self):
        """Recompute metadata stats from the businesses list."""
        self.metadata.total_businesses = len(self.businesses)
        self.metadata.total_with_email = sum(
            1 for b in self.businesses if b.business_email
        )
        self.metadata.total_with_phone = sum(
            1 for b in self.businesses if b.phone_number
        )
        self.metadata.total_with_website = sum(
            1 for b in self.businesses if b.website_url
        )
        self.metadata.total_with_instagram = sum(
            1 for b in self.businesses if b.instagram_url
        )
        self.metadata.total_with_facebook = sum(
            1 for b in self.businesses if b.facebook_url
        )
