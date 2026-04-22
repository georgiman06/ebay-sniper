"""
Discovery Service
-----------------
Fetches live eBay listings and clusters them into TrackedPart candidates.

Three modes:
  1. discover_trending()          — curated popular category searches
  2. discover_by_category(id)     — all items in a given eBay category
  3. discover_by_keyword(keyword) — arbitrary keyword search

All three return a list of PartCreate-style dicts ready to insert.
Duplicate detection is done by search_query at the API layer.
"""
import re
import logging
import httpx
from collections import defaultdict
from app.config import settings
from app.services.ebay_auth import get_access_token

logger = logging.getLogger(__name__)

BROWSE_SEARCH_URL = f"{settings.ebay_browse_api_url}/item_summary/search"
MAX_CLUSTERS = 15       # max parts created per discovery call
DISCOVERY_LIMIT = 200   # items to fetch from eBay per call

# ── Trending category definitions ────────────────────────────────────────────

TRENDING_CATEGORIES = [
    {
        "id": "gpu",
        "name": "GPUs / Graphics Cards",
        "category": "Electronics",
        "query": "used graphics card GPU -lot -broken",
        "ebay_category_id": "27386",
        "icon": "🖥️",
    },
    {
        "id": "cpu",
        "name": "CPUs / Processors",
        "category": "Electronics",
        "query": "used CPU processor desktop -lot",
        "ebay_category_id": "164",
        "icon": "🧠",
    },
    {
        "id": "laptop",
        "name": "Laptops",
        "category": "Electronics",
        "query": "used laptop -broken -cracked -parts",
        "ebay_category_id": "177",
        "icon": "💻",
    },
    {
        "id": "phone",
        "name": "Smartphones",
        "category": "Electronics",
        "query": "used iPhone OR Samsung unlocked smartphone",
        "ebay_category_id": "9355",
        "icon": "📱",
    },
    {
        "id": "tools",
        "name": "Power Tools",
        "category": "Tools",
        "query": "Milwaukee DeWalt Makita used tool -lot",
        "ebay_category_id": "631",
        "icon": "🔧",
    },
    {
        "id": "auto",
        "name": "Auto Parts",
        "category": "Automotive",
        "query": "used OEM auto parts -lot -broken",
        "ebay_category_id": "6030",
        "icon": "🚗",
    },
    {
        "id": "console",
        "name": "Gaming Consoles",
        "category": "Gaming",
        "query": "used PS5 OR Xbox Series console -lot",
        "ebay_category_id": "139971",
        "icon": "🎮",
    },
    {
        "id": "printer",
        "name": "Printers",
        "category": "Office",
        "query": "used laser printer -parts -broken",
        "ebay_category_id": "617",
        "icon": "🖨️",
    },
]


# ── Public API ────────────────────────────────────────────────────────────────

async def discover_trending() -> list[dict]:
    """Returns trending candidate parts across all curated categories."""
    candidates = []
    for cat in TRENDING_CATEGORIES:
        items = await _fetch_items(cat["query"], cat["ebay_category_id"])
        # For trending, each category becomes ONE solid tracked part using
        # the curated query — this guarantees the Finding API will work.
        clusters = _cluster_titles(items, cat["category"], base_query=cat["query"])
        logger.info("Trending '%s' → %d clusters from %d items", cat["name"], len(clusters), len(items))
        candidates.extend(clusters)
    return candidates


async def discover_by_category(category_id: str, category_name: str) -> list[dict]:
    """Imports top parts from a specific eBay category ID."""
    items = await _fetch_items(query=None, category_id=category_id)
    clusters = _cluster_titles(items, category_name)
    logger.info("Category '%s' (%s) → %d clusters", category_name, category_id, len(clusters))
    return clusters


async def discover_by_keyword(keyword: str) -> list[dict]:
    """Auto-adds parts based on a free-form keyword search."""
    category = _infer_category(keyword)
    items = await _fetch_items(query=keyword, category_id=None)
    # Use the original keyword as the search_query — guaranteed to work with eBay.
    clusters = _cluster_titles(items, category, base_query=keyword)
    logger.info("Keyword '%s' → %d clusters from %d items", keyword, len(clusters), len(items))
    return clusters


def get_trending_categories() -> list[dict]:
    """Returns the static trending category definitions for the frontend."""
    return [
        {"id": c["id"], "name": c["name"], "category": c["category"],
         "icon": c["icon"], "ebay_category_id": c["ebay_category_id"]}
        for c in TRENDING_CATEGORIES
    ]


# ── eBay fetch ────────────────────────────────────────────────────────────────

async def _fetch_items(query: str | None, category_id: str | None) -> list[dict]:
    """Hits Browse API and returns raw item list."""
    token = await get_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "X-EBAY-C-MARKETPLACE-ID": settings.ebay_marketplace_id,
    }
    params: dict = {
        "limit": str(DISCOVERY_LIMIT),
        "sort": "bestMatch",
        "filter": "itemLocationCountry:US,conditions:{USED|VERY_GOOD|GOOD|SELLER_REFURBISHED}",
    }
    if query:
        params["q"] = query
    if category_id:
        params["category_ids"] = category_id

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(BROWSE_SEARCH_URL, headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()
        return data.get("itemSummaries", [])
    except httpx.HTTPError as e:
        logger.error("Discovery fetch failed query=%s cat=%s err=%s", query, category_id, e)
        return []


# ── Title clustering ──────────────────────────────────────────────────────────

# Words to strip before clustering
_NOISE = {
    "used", "new", "like", "lot", "set", "bundle", "oem", "genuine", "original",
    "replacement", "broken", "parts", "only", "unlocked", "refurbished", "refurb",
    "good", "great", "excellent", "condition", "tested", "working", "free",
    "shipping", "the", "and", "for", "with", "a", "an", "in", "of",
}


def _tokenize(title: str) -> list[str]:
    tokens = re.findall(r"[a-zA-Z0-9]+", title.lower())
    return [t for t in tokens if t not in _NOISE and len(t) > 1]


def _cluster_key(title: str) -> str:
    tokens = _tokenize(title)
    # Use first 3 meaningful tokens as cluster key
    return " ".join(tokens[:3])


def _cluster_titles(
    items: list[dict],
    category: str,
    base_query: str | None = None,
) -> list[dict]:
    """
    Groups eBay item summaries by title cluster.

    If base_query is provided (trending/keyword mode), we create ONE part per
    cluster but use a search_query built from the cluster key PLUS the base_query
    context so eBay Finding API gets a meaningful, working query.

    Returns a list of PartCreate-style dicts, capped at MAX_CLUSTERS.
    """
    clusters: dict[str, list] = defaultdict(list)
    for item in items:
        title = item.get("title", "")
        if not title:
            continue
        key = _cluster_key(title)
        if key and len(key) > 4:  # skip very short keys
            clusters[key].append(item)

    # Sort clusters by size (most listings = most popular)
    sorted_clusters = sorted(clusters.items(), key=lambda x: -len(x[1]))

    parts = []
    for key, cluster_items in sorted_clusters[:MAX_CLUSTERS]:
        titles = [i.get("title", "") for i in cluster_items]
        name = _most_common(titles)

        if base_query:
            # Combine cluster key with base_query for a richer, valid eBay query
            # e.g. key="nvidia rtx 3080" + base_query="used graphics card GPU"
            # → search_query="nvidia rtx 3080 used GPU"
            key_words = key.split()
            base_words = base_query.split()
            # Merge: cluster key first (more specific), then non-overlapping base words
            combined = key_words + [w for w in base_words if w.lower() not in key.lower()]
            search_query = " ".join(combined[:8])  # keep it under 8 tokens
        else:
            search_query = key

        parts.append({
            "name": name[:120],
            "category": category,
            "search_query": search_query,
            "target_margin_override": None,
            "sample_count": len(cluster_items),
        })

    return parts


def _most_common(lst: list[str]) -> str:
    if not lst:
        return ""
    return max(set(lst), key=lst.count)


def _infer_category(keyword: str) -> str:
    kw = keyword.lower()
    if any(w in kw for w in ["gpu", "graphics", "rtx", "gtx", "rx", "cpu", "processor", "laptop", "phone", "iphone", "samsung"]):
        return "Electronics"
    if any(w in kw for w in ["tool", "drill", "saw", "milwaukee", "dewalt"]):
        return "Tools"
    if any(w in kw for w in ["car", "auto", "truck", "oem", "engine"]):
        return "Automotive"
    if any(w in kw for w in ["ps5", "xbox", "nintendo", "console", "gaming"]):
        return "Gaming"
    return "General"
