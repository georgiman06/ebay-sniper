"""
Suggestion Engine — "You May Also Want to Track"
-------------------------------------------------
Works exactly like Instagram's suggestion algorithm but for eBay parts:

Signal 1 — CATEGORY SIBLINGS
  User tracks RTX 3080 (GPU, $400-600 tier) 
  → Suggest other GPUs in the same price tier they haven't added yet

Signal 2 — BRAND FAMILY  
  User tracks anything NVIDIA → suggest other NVIDIA parts
  User tracks iPhone 14 Pro → suggest iPhone 13, iPhone 15

Signal 3 — SEARCH HISTORY FREQUENCY
  Parts searched 2+ times but never added = high-intent, surface first

Signal 4 — COMPLEMENTARY CATEGORIES
  User heavily tracks GPUs + CPUs → suggest Motherboards, RAM
  User tracks iPhones → suggest AirPods, Apple Watch

Signal 5 — PRICE TIER CLUSTERING
  User mostly tracks $300-600 items → don't suggest $3000 items
  Keep suggestions in their demonstrated buying range
"""
import logging
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.search_history import SearchHistory
from app.models.part import TrackedPart

logger = logging.getLogger(__name__)

# ── Category → complementary categories ──────────────────────────────────────
COMPLEMENTARY = {
    "GPUs":     ["CPUs", "Motherboards", "RAM"],
    "CPUs":     ["GPUs", "Motherboards", "RAM", "Cooling"],
    "Laptops":  ["Phones", "Tablets", "Audio"],
    "Phones":   ["Laptops", "Audio", "Watches"],
    "Gaming":   ["Monitors", "Audio", "GPUs"],
    "Watches":  ["Phones", "Audio"],
    "Audio":    ["Phones", "Laptops", "Watches"],
    "Tools":    ["Tools"],  # stays within same category
}

# ── Brand family groups ───────────────────────────────────────────────────────
BRAND_FAMILIES = {
    "Apple":    ["iPhone", "MacBook", "AirPods", "Apple Watch", "iPad", "Mac Mini"],
    "NVIDIA":   ["RTX 4090", "RTX 4080", "RTX 4070", "RTX 3090", "RTX 3080", "RTX 3070", "RTX 3060"],
    "AMD":      ["RX 7900", "RX 6800", "Ryzen 9", "Ryzen 7", "Ryzen 5"],
    "Intel":    ["i9-14900K", "i9-13900K", "i7-13700K", "i7-12700K", "i5-13600K"],
    "Samsung":  ["Galaxy S24", "Galaxy S23", "Galaxy S22", "Galaxy Tab"],
    "Sony":     ["WH-1000XM5", "WF-1000XM5", "PlayStation 5"],
    "Microsoft":["Xbox Series X", "Xbox Series S", "Surface Pro", "Surface Laptop"],
}

# ── Price tier bands ──────────────────────────────────────────────────────────
PRICE_TIERS = {
    "budget": (0, 150),
    "mid":    (150, 400),
    "high":   (400, 800),
    "ultra":  (800, 99999),
}


def classify_price_tier(price: float | None) -> str:
    if not price:
        return "mid"
    for tier, (low, high) in PRICE_TIERS.items():
        if low <= price < high:
            return tier
    return "ultra"


def extract_brand(name: str) -> str | None:
    name_lower = name.lower()
    for brand in BRAND_FAMILIES:
        if brand.lower() in name_lower:
            return brand
    # Catch common shorthands
    if "rtx" in name_lower or "gtx" in name_lower:
        return "NVIDIA"
    if "rx " in name_lower or "ryzen" in name_lower:
        return "AMD"
    if "iphone" in name_lower or "macbook" in name_lower or "airpod" in name_lower:
        return "Apple"
    if "galaxy" in name_lower:
        return "Samsung"
    return None


async def get_suggestions(db: AsyncSession, limit: int = 8) -> list[dict]:
    """
    Main entry point. Analyzes the user's search history and currently
    tracked parts to generate ranked suggestions.
    """
    # ── Load context ──────────────────────────────────────────────────────────
    tracked_result = await db.execute(select(TrackedPart).where(TrackedPart.is_active == True))
    tracked_parts  = tracked_result.scalars().all()

    history_result = await db.execute(
        select(SearchHistory).order_by(SearchHistory.last_searched_at.desc()).limit(50)
    )
    history = history_result.scalars().all()

    if not tracked_parts and not history:
        return []

    # Build sets of what user already has (to avoid re-suggesting)
    tracked_names   = {p.name.lower() for p in tracked_parts}
    tracked_queries = {p.search_query.lower() for p in tracked_parts}

    # ── Build user profile ────────────────────────────────────────────────────
    categories_used  = {}  # category → count
    brands_used      = {}  # brand → count
    price_tiers_used = {}  # tier → count

    for part in tracked_parts:
        cat = part.category or "Unknown"
        categories_used[cat] = categories_used.get(cat, 0) + 1

        brand = extract_brand(part.name)
        if brand:
            brands_used[brand] = brands_used.get(brand, 0) + 1

        tier = classify_price_tier(part.avg_sold_price)
        price_tiers_used[tier] = price_tiers_used.get(tier, 0) + 1

    # Dominant signals
    top_category  = max(categories_used, key=categories_used.get) if categories_used else None
    top_brand     = max(brands_used,     key=brands_used.get)     if brands_used     else None
    top_tier      = max(price_tiers_used,key=price_tiers_used.get)if price_tiers_used else "mid"

    # ── Score candidates ──────────────────────────────────────────────────────
    scored: dict[str, dict] = {}  # query → candidate

    def add_candidate(name: str, category: str, query: str, 
                       reason: str, score: float):
        key = query.lower()
        if key in tracked_queries or name.lower() in tracked_names:
            return  # Already tracking this
        if key not in scored or scored[key]["score"] < score:
            scored[key] = {
                "name":     name,
                "category": category,
                "query":    query,
                "reason":   reason,
                "score":    score,
            }
        else:
            # Boost score if suggested by multiple signals
            scored[key]["score"] += score * 0.5

    # Signal 1: Brand family — highest intent signal
    if top_brand and top_brand in BRAND_FAMILIES:
        for item in BRAND_FAMILIES[top_brand]:
            if item.lower() not in tracked_names:
                add_candidate(
                    name=item,
                    category=top_category or "Electronics",
                    query=f"{item} used -broken -lot",
                    reason=f"You track other {top_brand} products",
                    score=0.9,
                )

    # Signal 2: History re-surface (searched but never added)
    for h in history:
        if h.was_added == 0 and h.search_count >= 1:
            add_candidate(
                name=h.resolved_name or h.raw_query,
                category=h.category or top_category or "Electronics",
                query=h.clean_query,
                reason="You searched for this before",
                score=0.85 + (h.search_count * 0.05),  # more searches = higher score
            )

    # Signal 3: Category siblings
    if top_category:
        siblings = _get_category_siblings(top_category, top_tier)
        for s in siblings:
            add_candidate(
                name=s["name"],
                category=top_category,
                query=s["query"],
                reason=f"Popular in {top_category}",
                score=0.7,
            )

    # Signal 4: Complementary categories
    if top_category and top_category in COMPLEMENTARY:
        for comp_cat in COMPLEMENTARY[top_category][:2]:
            comp_items = _get_category_siblings(comp_cat, top_tier)
            for item in comp_items[:2]:
                add_candidate(
                    name=item["name"],
                    category=comp_cat,
                    query=item["query"],
                    reason=f"Buyers of {top_category} also flip {comp_cat}",
                    score=0.6,
                )

    # ── Rank and return ───────────────────────────────────────────────────────
    ranked = sorted(scored.values(), key=lambda x: x["score"], reverse=True)
    return ranked[:limit]


async def record_search(
    db: AsyncSession,
    raw_query: str,
    clean_query: str,
    resolved_name: str | None = None,
    category: str | None = None,
    avg_price: float | None = None,
    was_added: bool = False,
):
    """
    Called every time the user searches or adds a part.
    Upserts into search_history — increments count if already exists.
    """
    result = await db.execute(
        select(SearchHistory).where(
            SearchHistory.clean_query == clean_query.lower()
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.search_count += 1
        existing.avg_price_at_search = avg_price or existing.avg_price_at_search
        if was_added:
            existing.was_added = 1
        db.add(existing)
    else:
        brand = extract_brand(resolved_name or raw_query)
        tier  = classify_price_tier(avg_price)
        record = SearchHistory(
            raw_query           = raw_query,
            clean_query         = clean_query.lower(),
            resolved_name       = resolved_name,
            category            = category,
            brand               = brand,
            price_tier          = tier,
            avg_price_at_search = avg_price,
            was_added           = 1 if was_added else 0,
        )
        db.add(record)

    await db.flush()


def _get_category_siblings(category: str, price_tier: str) -> list[dict]:
    """
    Returns a curated list of high-volume items per category + price tier.
    These are the most commonly flipped items — based on eBay sold volume data.
    """
    catalog = {
        "GPUs": {
            "budget": [
                {"name": "NVIDIA GTX 1660 Super", "query": "GTX 1660 Super used -lot"},
                {"name": "AMD RX 6600",            "query": "RX 6600 used -lot"},
            ],
            "mid": [
                {"name": "NVIDIA RTX 3060 Ti",  "query": "RTX 3060 Ti used -lot"},
                {"name": "NVIDIA RTX 3070",     "query": "RTX 3070 used -lot"},
                {"name": "AMD RX 6700 XT",      "query": "RX 6700 XT used -lot"},
            ],
            "high": [
                {"name": "NVIDIA RTX 3080",   "query": "RTX 3080 used -lot"},
                {"name": "NVIDIA RTX 3090",   "query": "RTX 3090 used -lot"},
                {"name": "AMD RX 6800 XT",    "query": "RX 6800 XT used -lot"},
            ],
            "ultra": [
                {"name": "NVIDIA RTX 4090", "query": "RTX 4090 used -lot"},
                {"name": "NVIDIA RTX 4080", "query": "RTX 4080 used -lot"},
                {"name": "AMD RX 7900 XTX", "query": "RX 7900 XTX used -lot"},
            ],
        },
        "CPUs": {
            "budget": [
                {"name": "AMD Ryzen 5 5600X",   "query": "Ryzen 5 5600X used"},
                {"name": "Intel Core i5-12400F", "query": "i5-12400F used"},
            ],
            "mid": [
                {"name": "AMD Ryzen 7 5700X",   "query": "Ryzen 7 5700X used"},
                {"name": "Intel Core i7-12700K", "query": "i7-12700K used"},
            ],
            "high": [
                {"name": "AMD Ryzen 9 5900X",   "query": "Ryzen 9 5900X used"},
                {"name": "Intel Core i9-12900K", "query": "i9-12900K used"},
            ],
            "ultra": [
                {"name": "Intel Core i9-13900K", "query": "i9-13900K used"},
                {"name": "AMD Ryzen 9 7950X",    "query": "Ryzen 9 7950X used"},
            ],
        },
        "Phones": {
            "budget": [
                {"name": "iPhone 12",             "query": "iPhone 12 unlocked used -cracked"},
                {"name": "Samsung Galaxy S21",    "query": "Galaxy S21 unlocked used"},
            ],
            "mid": [
                {"name": "iPhone 13",             "query": "iPhone 13 unlocked used -cracked"},
                {"name": "Samsung Galaxy S22",    "query": "Galaxy S22 unlocked used"},
            ],
            "high": [
                {"name": "iPhone 14 Pro",         "query": "iPhone 14 Pro unlocked used"},
                {"name": "Samsung Galaxy S23 Ultra", "query": "Galaxy S23 Ultra unlocked used"},
            ],
            "ultra": [
                {"name": "iPhone 15 Pro Max",     "query": "iPhone 15 Pro Max unlocked used"},
                {"name": "Samsung Galaxy S24 Ultra", "query": "Galaxy S24 Ultra unlocked used"},
            ],
        },
        "Laptops": {
            "mid": [
                {"name": "Dell XPS 13",             "query": "Dell XPS 13 used -broken"},
                {"name": "Lenovo ThinkPad T14",     "query": "ThinkPad T14 used -broken"},
            ],
            "high": [
                {"name": "Apple MacBook Air M2",    "query": "MacBook Air M2 used -cracked"},
                {"name": "Dell XPS 15",             "query": "Dell XPS 15 used -broken"},
            ],
            "ultra": [
                {"name": "Apple MacBook Pro 14 M3", "query": "MacBook Pro 14 M3 used -cracked"},
                {"name": "ASUS ROG Zephyrus G14",   "query": "ROG Zephyrus G14 used"},
            ],
        },
        "Gaming": {
            "mid": [
                {"name": "Nintendo Switch OLED",  "query": "Nintendo Switch OLED used -bundle"},
                {"name": "Steam Deck 64GB",       "query": "Steam Deck 64GB used"},
            ],
            "high": [
                {"name": "PlayStation 5",         "query": "PS5 console used -disc"},
                {"name": "Xbox Series X",         "query": "Xbox Series X used -bundle"},
            ],
        },
    }

    cat_data = catalog.get(category, {})
    # Fall back to "mid" if tier not in catalog
    return cat_data.get(price_tier, cat_data.get("mid", []))