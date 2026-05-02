import asyncio
import logging
import re
import urllib.parse
from datetime import datetime, timezone, timedelta
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.sold_listing import ScrapedSoldListing

logger = logging.getLogger(__name__)

CACHE_TTL_HOURS = 24

def parse_price(price_str: str) -> float:
    if not price_str: return 0.0
    # Handle "Free shipping" or "$25.00"
    clean = re.sub(r'[^\d.]', '', price_str)
    try:
        return float(clean) if clean else 0.0
    except ValueError:
        return 0.0

async def fetch_with_cache(search_query: str, condition_filter: str = "working") -> list[dict]:
    """
    1. Checks DB for cache of this query+condition.
    2. If missing or older than 24h, scrapes eBay with Playwright.
    3. Saves to DB and returns records.
    """
    cache_key = f"{search_query}__COND__{condition_filter}"
    async with AsyncSessionLocal() as db:
        # Check cache
        cutoff = datetime.now(timezone.utc) - timedelta(hours=CACHE_TTL_HOURS)
        result = await db.execute(
            select(ScrapedSoldListing).where(
                ScrapedSoldListing.search_query == cache_key,
                ScrapedSoldListing.scraped_at >= cutoff
            )
        )
        cached_items = result.scalars().all()
        
        if cached_items:
            logger.info(f"Scraper Cache HIT | query='{cache_key}' | items={len(cached_items)}")
            return [
                {
                    "ebay_item_id": item.ebay_item_id,
                    "title": item.title,
                    "sold_price": item.sold_price,
                    "shipping_cost": item.shipping_cost,
                    "total_cost": item.total_cost,
                    "condition": item.condition,
                    "sold_date": item.sold_date,
                    "listing_url": item.listing_url,
                }
                for item in cached_items
            ]
        
        logger.info(f"Scraper Cache MISS | query='{cache_key}' | Scraping eBay...")
        
        # Scrape
        scraped_dicts = await _scrape_ebay(search_query, condition_filter)
        
        if not scraped_dicts:
            logger.warning(f"Scraper returned no data for query: '{cache_key}'")
            return []
            
        # Clear out old cache for this query to prevent DB bloat
        await db.execute(delete(ScrapedSoldListing).where(ScrapedSoldListing.search_query == cache_key))
        
        # Save new cache
        now = datetime.now(timezone.utc)
        for d in scraped_dicts:
            db.add(ScrapedSoldListing(
                search_query=cache_key,
                scraped_at=now,
                ebay_item_id=d.get("ebay_item_id"),
                title=d["title"],
                sold_price=d["sold_price"],
                shipping_cost=d["shipping_cost"],
                total_cost=d["total_cost"],
                condition=d["condition"],
                sold_date=d["sold_date"],
                listing_url=d.get("listing_url")
            ))
            
        await db.commit()
        logger.info(f"Scraper successfully cached {len(scraped_dicts)} items for '{cache_key}'.")
        return scraped_dicts


async def _scrape_ebay(search_query: str, condition_filter: str) -> list[dict]:
    # Determine condition ID
    # 1000=New, 3000=Used, 7000=For Parts
    if condition_filter.lower() == "parts":
        cond_param = 7000
    elif condition_filter.lower() == "new":
        cond_param = 1000
    else:
        cond_param = 3000

    encoded_query = urllib.parse.quote(search_query)
    url = f"https://www.ebay.com/sch/i.html?_nkw={encoded_query}&LH_Sold=1&LH_Complete=1&LH_ItemCondition={cond_param}&rt=nc"
    
    results = []
    
    async with async_playwright() as p:
        # Launch chromium in headless mode
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        try:
            # Wait until DOM is loaded
            await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            
            # Additional wait just to be safe for JavaScript hydration
            await page.wait_for_timeout(2000)
            
            html = await page.content()
        except Exception as e:
            logger.error(f"Playwright navigation failed: {e}")
            await browser.close()
            return []
            
        await browser.close()
        
    soup = BeautifulSoup(html, "lxml")
    
    # Each listing is an li with class s-item or s-card
    items = soup.find_all("li", class_=lambda c: c and ("s-item" in c or "s-card" in c))
    
    for item in items:
        try:
            title_el = item.find(class_=lambda c: c and ("s-item__title" in c or "s-card__title" in c))
            if not title_el: continue
            
            title = title_el.text.strip()
            # Skip the hidden "Shop on eBay" placeholder
            if title.lower().startswith("shop on ebay"):
                continue
                
            price_el = item.find(class_=lambda c: c and ("s-item__price" in c or "s-card__price" in c))
            if not price_el: continue
            
            # Get the raw text, which might look like "$45.00" or "$45.00 - $55.00" if lot
            price_text = price_el.text.strip()
            # If it's a range, just take the first number
            if " to " in price_text.lower():
                price_text = price_text.split(" to ")[0]
                
            sold_price = parse_price(price_text)
            if sold_price < 2.0:
                continue # Skip garbage bids
                
            # Shipping
            shipping_el = item.find(class_="s-item__shipping")
            shipping_cost = 0.0
            if shipping_el:
                shipping_text = shipping_el.text.strip().lower()
                if "free" not in shipping_text:
                    shipping_cost = parse_price(shipping_text)
                    
            # Condition
            cond_el = item.find(class_=lambda c: c and ("SECONDARY_INFO" in c or "s-card__subtitle" in c))
            condition = cond_el.text.strip() if cond_el else "Used"
            
            # Date
            # Usually found in: <span class="POSITIVE">Sold Feb 14, 2024</span> or <span class="s-card__title-label">
            date_el = item.find(class_=lambda c: c and ("POSITIVE" in c or "s-card__title-label" in c))
            date_text = date_el.text.strip() if date_el else ""
            
            # We map string date to a simple datetime. If parsing fails, fall back to now.
            # eBay format usually "Sold Feb 14, 2024" or just "Feb 14, 2024"
            sold_date = datetime.now(timezone.utc)
            if date_text:
                date_clean = date_text.replace("Sold ", "").strip()
                try:
                    # Parse "Feb 14, 2024"
                    parsed_date = datetime.strptime(date_clean, "%b %d, %Y")
                    # Make it timezone-aware UTC
                    sold_date = parsed_date.replace(tzinfo=timezone.utc)
                except ValueError:
                    pass
            
            link_el = item.find("a", class_=lambda c: c and ("s-item__link" in c or "s-card__link" in c))
            listing_url = link_el["href"] if link_el and "href" in link_el.attrs else None
            
            # Try to extract ebay item ID from URL
            item_id = None
            if listing_url and "/itm/" in listing_url:
                try:
                    parts = listing_url.split("/itm/")[1]
                    item_id = parts.split("?")[0]
                except IndexError:
                    pass
                    
            results.append({
                "ebay_item_id": item_id,
                "title": title,
                "sold_price": sold_price,
                "shipping_cost": shipping_cost,
                "total_cost": sold_price + shipping_cost,
                "condition": condition,
                "sold_date": sold_date,
                "listing_url": listing_url,
            })
            
        except Exception as e:
            logger.debug(f"Error parsing row: {e}")
            continue

    logger.info(f"Playwright parsed {len(results)} valid items from page.")
    return results
