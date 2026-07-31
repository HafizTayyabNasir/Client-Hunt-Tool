"""
gmaps_scraper.py — Google Maps Deep Business Scraper (FAST v2)
Main CLI entry point. Orchestrates all three layers:
  1. Playwright browser automation — optimized page.goto extraction (maps_browser.py)
  2. Async batch email extraction — aiohttp concurrent crawling (email_crawler.py)
  3. Data enrichment — phone formatting + geocoding (data_enricher.py)

Usage:
  python gmaps_scraper.py --city "Lahore" --category "restaurants"
  python gmaps_scraper.py --city "New York" --category "dentists" --max-results 50
  python gmaps_scraper.py --city "London" --category "doctors" --headless
"""
from __future__ import annotations

import argparse
import asyncio
import io
import json
import logging
import sys
import time
from datetime import datetime
from pathlib import Path

# Force UTF-8 on Windows consoles
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from rich.console import Console
from rich.panel import Panel
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    SpinnerColumn,
    TextColumn,
    TimeElapsedColumn,
    TimeRemainingColumn,
)
from rich.table import Table

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from config import OUTPUT_DIR, AUTO_SAVE_INTERVAL
from scraper.models import BusinessData, ScrapeMetadata, ScrapeOutput
from scraper.maps_browser import MapsBrowser
from scraper.email_crawler import AsyncEmailCrawler
from scraper.data_enricher import DataEnricher

console = Console(force_terminal=True)
logger = logging.getLogger(__name__)


# ----------------------------------------------------------------
# CLI ARGUMENT PARSING
# ----------------------------------------------------------------
def parse_args():
    parser = argparse.ArgumentParser(
        description="Google Maps Deep Business Scraper (Fast Mode)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python gmaps_scraper.py --city "Lahore" --category "restaurants"
  python gmaps_scraper.py --city "New York" --category "dentists" --max-results 50
  python gmaps_scraper.py --city "London" --category "doctors" --headless
        """,
    )
    parser.add_argument("--city", required=True, help="City to search in")
    parser.add_argument("--category", required=True, help="Business category")
    parser.add_argument("--max-results", type=int, default=None, help="Max businesses (default: all)")
    parser.add_argument("--headless", action="store_true", help="Run browser in headless mode")
    parser.add_argument("--no-emails", action="store_true", help="Skip email extraction (faster)")
    parser.add_argument("--with-reviews", action="store_true", help="Extract reviews (slower)")
    parser.add_argument("--output", type=str, default=None, help="Custom output file path")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    return parser.parse_args()


def print_banner():
    banner_text = (
        "+==================================================+\n"
        "|   GOOGLE MAPS DEEP BUSINESS SCRAPER   [FAST]     |\n"
        "|   Playwright + aiohttp + Regex Engine             |\n"
        "|   v2.0.0                                         |\n"
        "+==================================================+"
    )
    console.print(Panel(banner_text, border_style="cyan", expand=False))
    console.print()


def auto_save(output: ScrapeOutput, filepath: Path):
    output.compute_stats()
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(output.model_dump(), f, indent=2, ensure_ascii=False)


# ----------------------------------------------------------------
# MAIN ASYNC PIPELINE
# ----------------------------------------------------------------
async def run_scraper(args):
    city = args.city
    category = args.category
    headless = args.headless
    max_results = args.max_results
    skip_emails = args.no_emails
    with_reviews = args.with_reviews

    # Output file path
    if args.output:
        output_path = Path(args.output)
    else:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_city = city.replace(" ", "_").lower()
        safe_cat = category.replace(" ", "_").lower()
        output_path = OUTPUT_DIR / f"{safe_city}_{safe_cat}_{ts}.json"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Initialize components
    browser = MapsBrowser(headless=headless, max_results=max_results)
    enricher = DataEnricher(city=city)
    email_crawler = AsyncEmailCrawler(max_concurrent=20) if not skip_emails else None

    output = ScrapeOutput(
        metadata=ScrapeMetadata(city=city, category=category),
        businesses=[],
    )

    businesses: list[BusinessData] = []

    try:
        # ============================================================
        # PHASE 1: Launch browser + search + scroll
        # ============================================================
        console.print(Panel(
            f"[bold]Searching:[/bold] {category} in {city}",
            title="Phase 1 -- Search & Scroll",
            border_style="cyan",
        ))

        t_start = time.time()
        await browser.launch()
        business_urls = await browser.search_and_scroll(city, category)

        if not business_urls:
            console.print("[red]No businesses found! Check your search query.[/red]")
            return

        total = len(business_urls)
        t_scroll = time.time() - t_start
        console.print(f"\n[green]>[/green] Found [bold]{total}[/bold] businesses in {t_scroll:.1f}s\n")

        # ============================================================
        # PHASE 2: Multi-tab concurrent extraction (5 tabs)
        # ============================================================
        console.print(Panel(
            f"Extracting data for {total} businesses (3 concurrent tabs)",
            title="Phase 2 -- Detail Extraction",
            border_style="yellow",
        ))

        is_tty = sys.stdout.isatty()
        stats = {
            "Total Found": total,
            "Scraped": 0,
            "With Phone": 0,
            "With Website": 0,
            "Errors": 0,
        }

        t_extract_start = time.time()
        last_logged_step = [-1]

        if is_tty:
            progress = Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(bar_width=40),
                MofNCompleteColumn(),
                TimeElapsedColumn(),
                TextColumn("[dim]ETA:[/dim]"),
                TimeRemainingColumn(),
                console=console,
            )
            progress.start()
            task_id = progress.add_task("Extracting...", total=total)

        def on_progress(completed, total_count, biz_data):
            if is_tty:
                progress.update(task_id, description=f"Business {completed}/{total_count}")
                progress.advance(task_id)
            else:
                pct = int((completed / max(total_count, 1)) * 100)
                if completed == total_count or completed - last_logged_step[0] >= max(1, total_count // 10):
                    last_logged_step[0] = completed
                    print(f"PROGRESS: Business {completed}/{total_count} ({pct}%)", flush=True)

            if biz_data and biz_data.business_name:
                stats["Scraped"] += 1
                if biz_data.phone_number:
                    stats["With Phone"] += 1
                if biz_data.website_url:
                    stats["With Website"] += 1
            else:
                stats["Errors"] += 1

        try:
            businesses = await browser.extract_all_concurrent(
                urls=business_urls,
                on_progress=on_progress,
                num_workers=3,
            )
        finally:
            if is_tty:
                progress.stop()

        t_extract = time.time() - t_extract_start
        per_biz = t_extract / max(len(businesses), 1)
        console.print(f"\n[green]>[/green] Extracted {len(businesses)} businesses in {t_extract:.1f}s "
                      f"({per_biz:.1f}s/business)\n")

        # ============================================================
        # PHASE 3: Data enrichment (phone formatting, geocoding)
        # ============================================================
        console.print("[dim]Enriching data (phone formatting, geocoding)...[/dim]")

        for biz in businesses:
            if biz.phone_number:
                phone_fmt = enricher.format_phone(biz.phone_number)
                biz.phone_number = phone_fmt["international"]
                biz.phone_number_local = phone_fmt["local"]

            if not biz.latitude or not biz.longitude:
                coords = enricher.parse_coords_from_url(biz.google_maps_url)
                biz.latitude = coords["latitude"]
                biz.longitude = coords["longitude"]
            if not biz.latitude and biz.full_address:
                coords = enricher.geocode_address(biz.full_address)
                biz.latitude = coords["latitude"]
                biz.longitude = coords["longitude"]

            biz.business_name = enricher.clean_text(biz.business_name)
            biz.full_address = enricher.clean_text(biz.full_address)
            biz.category = enricher.clean_text(biz.category)
            biz.sub_category = enricher.clean_text(biz.sub_category)
            biz.scraped_at = datetime.now().isoformat()

        # ============================================================
        # PHASE 4: Async batch email extraction (all at once)
        # ============================================================
        if email_crawler:
            website_urls = [biz.website_url for biz in businesses]
            websites_with_url = sum(1 for u in website_urls if u)

            if websites_with_url > 0:
                console.print(Panel(
                    f"Crawling {websites_with_url} websites for emails (async batch)",
                    title="Phase 4 -- Email Extraction",
                    border_style="magenta",
                ))

                t_email_start = time.time()
                email_count = 0
                fb_count = 0
                ig_count = 0
                last_email_step = [-1]

                if is_tty:
                    email_progress = Progress(
                        SpinnerColumn(),
                        TextColumn("[progress.description]{task.description}"),
                        BarColumn(bar_width=40),
                        MofNCompleteColumn(),
                        TimeElapsedColumn(),
                        TextColumn("[dim]ETA:[/dim]"),
                        TimeRemainingColumn(),
                        console=console,
                    )
                    email_progress.start()
                    task_id = email_progress.add_task("Crawling...", total=len(website_urls))

                def on_email_progress(completed, total_count, email_data):
                    if is_tty:
                        email_progress.update(task_id, description=f"Website {completed}/{total_count}")
                        email_progress.advance(task_id)
                    else:
                        pct = int((completed / max(total_count, 1)) * 100)
                        if completed == total_count or completed - last_email_step[0] >= max(1, total_count // 10):
                            last_email_step[0] = completed
                            print(f"CRAWL_PROGRESS: Website {completed}/{total_count} ({pct}%)", flush=True)

                try:
                    email_results = await email_crawler.batch_extract(
                        website_urls,
                        on_progress=on_email_progress
                    )
                finally:
                    if is_tty:
                        email_progress.stop()

                t_email = time.time() - t_email_start

                for biz, email_data in zip(businesses, email_results):
                    biz.business_email = email_data.get("business_email")
                    biz.owner_email = email_data.get("owner_email")
                    biz.facebook_url = email_data.get("facebook_url")
                    biz.instagram_url = email_data.get("instagram_url")
                    if biz.business_email:
                        email_count += 1
                    if biz.facebook_url:
                        fb_count += 1
                    if biz.instagram_url:
                        ig_count += 1

                stats["With Email"] = email_count
                stats["With Facebook"] = fb_count
                stats["With Instagram"] = ig_count
                console.print(
                    f"\n[green]>[/green] Found {email_count} emails, "
                    f"{fb_count} Facebook links, {ig_count} Instagram profiles in {t_email:.1f}s\n"
                )

        # ============================================================
        # PHASE 5 (Optional): Review extraction
        # ============================================================
        if with_reviews and businesses:
            console.print(Panel(
                f"Extracting reviews for {len(businesses)} businesses",
                title="Phase 5 -- Reviews",
                border_style="blue",
            ))
            rev_progress = Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(bar_width=40),
                MofNCompleteColumn(),
                TimeElapsedColumn(),
                console=console,
            )
            with rev_progress:
                task_id = rev_progress.add_task("Reviews...", total=len(businesses))
                for biz in businesses:
                    revs = await browser.extract_reviews(biz.google_maps_url)
                    biz.reviews = revs
                    rev_progress.advance(task_id)

        # ============================================================
        # SAVE OUTPUT
        # ============================================================
        output.businesses = businesses
        output.metadata.scrape_completed = datetime.now().isoformat()
        output.compute_stats()

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output.model_dump(), f, indent=2, ensure_ascii=False)

        # Summary
        t_total = time.time() - t_start
        summary = Table(title="Scrape Summary", border_style="green")
        summary.add_column("Metric", style="cyan")
        summary.add_column("Value", style="bold white")
        summary.add_row("Total Found", str(total))
        summary.add_row("Scraped", str(len(businesses)))
        summary.add_row("With Phone", str(stats.get("With Phone", 0)))
        summary.add_row("With Website", str(stats.get("With Website", 0)))
        summary.add_row("With Email", str(stats.get("With Email", 0)))
        summary.add_row("With Facebook", str(stats.get("With Facebook", 0)))
        summary.add_row("With Instagram", str(stats.get("With Instagram", 0)))
        summary.add_row("Errors", str(stats.get("Errors", 0)))
        summary.add_row("Total Time", f"{t_total:.1f}s")
        summary.add_row("Output File", str(output_path))
        console.print(summary)
        console.print(f"\n[bold green]Done![/bold green] Saved to [underline]{output_path}[/underline]\n")

    except KeyboardInterrupt:
        console.print("\n[yellow]Interrupted! Saving progress...[/yellow]")
        if businesses:
            output.businesses = businesses
            output.metadata.scrape_completed = datetime.now().isoformat()
            auto_save(output, output_path)
            console.print(f"[green]Progress saved to {output_path}[/green]")

    except Exception as e:
        console.print(f"\n[red]Fatal error: {e}[/red]")
        logger.exception("Fatal error")
        if businesses:
            output.businesses = businesses
            auto_save(output, output_path)
            console.print(f"[yellow]Partial results saved to {output_path}[/yellow]")

    finally:
        if email_crawler:
            await email_crawler.close()
        await browser.close()


# ----------------------------------------------------------------
# ENTRY POINT
# ----------------------------------------------------------------
def main():
    args = parse_args()

    log_level = logging.DEBUG if args.debug else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        datefmt="%H:%M:%S",
    )
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("aiohttp").setLevel(logging.WARNING)

    print_banner()

    console.print(f"  [dim]City:[/dim]      [bold]{args.city}[/bold]")
    console.print(f"  [dim]Category:[/dim]  [bold]{args.category}[/bold]")
    console.print(f"  [dim]Headless:[/dim]  [bold]{args.headless}[/bold]")
    console.print(f"  [dim]Max:[/dim]       [bold]{args.max_results or 'unlimited'}[/bold]")
    console.print(f"  [dim]Emails:[/dim]    [bold]{'disabled' if args.no_emails else 'enabled'}[/bold]")
    console.print(f"  [dim]Reviews:[/dim]   [bold]{'enabled' if args.with_reviews else 'disabled (use --with-reviews)'}[/bold]")
    console.print()

    asyncio.run(run_scraper(args))


if __name__ == "__main__":
    main()
