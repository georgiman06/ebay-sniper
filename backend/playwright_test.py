import asyncio
import re
import urllib.parse
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

SEARCH_QUERY = "RTX 3080"
CONDITION_FILTER = "working"  # working | new | parts


def parse_price(price_str: str) -> float:
    if not price_str:
        return 0.0
    clean = re.sub(r'[^\d.]', '', price_str)
    try:
        return float(clean) if clean else 0.0
    except ValueError:
        return 0.0


async def main():
    if CONDITION_FILTER.lower() == "parts":
        cond_param = 7000
    elif CONDITION_FILTER.lower() == "new":
        cond_param = 1000
    else:
        cond_param = 3000

    encoded_query = urllib.parse.quote(SEARCH_QUERY)
    url = (
        f"https://www.ebay.com/sch/i.html"
        f"?_nkw={encoded_query}&LH_Sold=1&LH_Complete=1"
        f"&LH_ItemCondition={cond_param}&rt=nc"
    )
    print(f"Fetching: {url}\n")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        )
        page = await context.new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            await page.wait_for_timeout(2000)
            html = await page.content()
        except Exception as e:
            print(f"Navigation failed: {e}")
            await browser.close()
            return
        await browser.close()

    soup = BeautifulSoup(html, "lxml")

    items = soup.find_all("li", class_=lambda c: c and ("s-item" in c or "s-card" in c))
    print(f"Found {len(items)} raw listing elements\n")

    results = []
    for item in items:
        try:
            title_el = item.find(class_=lambda c: c and ("s-item__title" in c or "s-card__title" in c))
            if not title_el:
                continue
            title = title_el.text.strip()
            if title.lower().startswith("shop on ebay"):
                continue

            price_el = item.find(class_=lambda c: c and ("s-item__price" in c or "s-card__price" in c))
            if not price_el:
                continue
            price_text = price_el.text.strip()
            if " to " in price_text.lower():
                price_text = price_text.split(" to ")[0]
            sold_price = parse_price(price_text)
            if sold_price < 2.0:
                continue

            shipping_el = item.find(class_="s-item__shipping")
            shipping_cost = 0.0
            if shipping_el:
                shipping_text = shipping_el.text.strip().lower()
                if "free" not in shipping_text:
                    shipping_cost = parse_price(shipping_text)

            cond_el = item.find(class_=lambda c: c and ("SECONDARY_INFO" in c or "s-card__subtitle" in c))
            condition = cond_el.text.strip() if cond_el else "Used"

            date_el = item.find(class_=lambda c: c and ("POSITIVE" in c or "s-card__title-label" in c))
            date_text = date_el.text.strip() if date_el else ""
            sold_date = datetime.now(timezone.utc)
            if date_text:
                date_clean = date_text.replace("Sold ", "").strip()
                try:
                    parsed = datetime.strptime(date_clean, "%b %d, %Y")
                    sold_date = parsed.replace(tzinfo=timezone.utc)
                except ValueError:
                    pass

            link_el = item.find("a", class_=lambda c: c and ("s-item__link" in c or "s-card__link" in c))
            listing_url = link_el["href"] if link_el and "href" in link_el.attrs else None

            item_id = None
            if listing_url and "/itm/" in listing_url:
                try:
                    item_id = listing_url.split("/itm/")[1].split("?")[0]
                except IndexError:
                    pass

            results.append({
                "ebay_item_id": item_id,
                "title": title,
                "sold_price": sold_price,
                "shipping_cost": shipping_cost,
                "total_cost": sold_price + shipping_cost,
                "condition": condition,
                "sold_date": sold_date.strftime("%Y-%m-%d"),
                "listing_url": listing_url,
            })
        except Exception as e:
            print(f"  [parse error] {e}")

    print(f"Parsed {len(results)} valid listings:\n")
    for r in results[:10]:
        print(
            f"  [{r['sold_date']}] ${r['total_cost']:.2f} "
            f"(${r['sold_price']:.2f} + ${r['shipping_cost']:.2f} ship) "
            f"| {r['condition']} | {r['title'][:60]}"
        )
        if r["listing_url"]:
            print(f"           {r['listing_url'][:80]}")
    if len(results) > 10:
        print(f"  ... and {len(results) - 10} more")


asyncio.run(main())
