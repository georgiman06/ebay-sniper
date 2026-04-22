import asyncio
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

async def main():
    url = 'https://www.ebay.com/sch/i.html?_nkw=RTX+3080&LH_Sold=1&LH_Complete=1&LH_ItemCondition=4&rt=nc'
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        c = await b.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36')
        page = await c.new_page()
        await page.goto(url, wait_until='networkidle')
        await page.wait_for_timeout(2000)
        html = await page.content()
        await b.close()
        
    soup = BeautifulSoup(html, "lxml")
    
    items = soup.find_all("li", class_=lambda c: c and "s-item" in c)
    if not items:
        items = soup.find_all("li", class_=lambda c: c and "s-card" in c)
        print(f"Used s-card. Found {len(items)}")
    else:
        print(f"Used s-item. Found {len(items)}")
    
    if items:
        item = items[1] if len(items) > 1 else items[0]
        # Recursively print DOM structure of the item
        print("\n--- ITEM DOM ---")
        for child in item.find_all(True):
            cls = child.get("class", [])
            cls_str = " ".join(cls) if isinstance(cls, list) else cls
            text = child.get_text(separator=" ", strip=True)[:50]
            if cls_str and text:
                print(f"<{child.name} class='{cls_str}'>Text: {text}</>")

asyncio.run(main())
