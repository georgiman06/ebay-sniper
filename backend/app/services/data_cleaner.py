"""
Data Cleaner — IQR-Based Outlier Detection
--------------------------------------------
A sold listing is marked as an outlier if its price falls outside
the range: [Q1 - 1.5*IQR, Q3 + 1.5*IQR]

This handles:
  - Suspiciously cheap listings (broken, scam, or $1 auction bids)
  - Suspiciously expensive (bundle sales, price padding)
  - Title-based exclusions ("lot of", "bundle", "read description")

We FLAG outliers (is_outlier=True) rather than delete them.
This preserves data integrity and allows re-tuning later.
"""
import re
import logging
import pandas as pd
from scipy import stats

logger = logging.getLogger(__name__)

# Regex patterns that indicate a listing isn't a clean single-unit sale
EXCLUSION_PATTERNS = [
    r"\blot\s+of\b",
    r"\bbundle\b",
    r"\bfor\s+parts\b",
    r"\bnot\s+working\b",
    r"\bread\s+desc\b",
    r"\bas.?is\b",
    r"\bpair\s+of\b",
    r"\b\d+\s*x\s+",        # "2x RTX 3080"
    r"\bquantity\b",
]
EXCLUSION_RE = re.compile("|".join(EXCLUSION_PATTERNS), re.IGNORECASE)

# Hard floor — anything below this is almost certainly not a real sale
ABSOLUTE_MINIMUM_PRICE = 5.0


def clean_listings(raw_listings: list[dict], raw_query: str = "") -> list[dict]:
    """
    Takes raw parsed listings, applies cleaning logic (including strict query matching), and returns
    the same list with 'is_outlier' and 'outlier_reason' fields added.
    
    Args:
        raw_listings: output from ebay_finding._parse_items()
        raw_query: original user search string (e.g., '1 tb ssd card') to enforce strict matching
    
    Returns:
        Same list with added fields:
          - is_outlier: bool
          - outlier_reason: str | None
          - is_used_in_avg: bool
    """
    if not raw_listings:
        return []

    # Initialize flags
    for item in raw_listings:
        item["is_outlier"] = False
        item["outlier_reason"] = None
        item["is_used_in_avg"] = False

    # Pass 1: Title-based exclusions and STRICT MATCHING
    query_tokens = [t.lower() for t in raw_query.split()] if raw_query else []
    
    for item in raw_listings:
        title = item.get("title", "")
        title_lower = title.lower()
        
        # Check standard exclusion strings
        if EXCLUSION_RE.search(title):
            item["is_outlier"] = True
            item["outlier_reason"] = "excluded_title_pattern"
            continue
            
        # Check Strict Rule Matching (Mandatory Token Inclusion)
        if query_tokens:
            missing_tokens = [tok for tok in query_tokens if tok not in title_lower]
            if missing_tokens:
                item["is_outlier"] = True
                item["outlier_reason"] = f"failed_strict_match (missing: {', '.join(missing_tokens)})"

    # Pass 2: Absolute floor
    for item in raw_listings:
        if not item["is_outlier"] and item["total_cost"] < ABSOLUTE_MINIMUM_PRICE:
            item["is_outlier"] = True
            item["outlier_reason"] = "price_below_floor"

    # Pass 3: IQR on clean candidates only
    clean_prices = [
        item["total_cost"]
        for item in raw_listings
        if not item["is_outlier"]
    ]

    if len(clean_prices) >= 4:  # Need at least 4 points for IQR to be meaningful
        df = pd.Series(clean_prices)
        q1 = df.quantile(0.25)
        q3 = df.quantile(0.75)
        iqr = q3 - q1
        lower_bound = q1 - (1.5 * iqr)
        upper_bound = q3 + (1.5 * iqr)

        for item in raw_listings:
            if not item["is_outlier"]:
                price = item["total_cost"]
                if price < lower_bound:
                    item["is_outlier"] = True
                    item["outlier_reason"] = f"iqr_low (bound={lower_bound:.2f})"
                elif price > upper_bound:
                    item["is_outlier"] = True
                    item["outlier_reason"] = f"iqr_high (bound={upper_bound:.2f})"

    # Mark survivors as used in average
    surviving = [i for i in raw_listings if not i["is_outlier"]]
    for item in surviving:
        item["is_used_in_avg"] = True

    outlier_count = sum(1 for i in raw_listings if i["is_outlier"])
    logger.info(
        "Cleaning complete | total=%d | clean=%d | outliers=%d",
        len(raw_listings),
        len(surviving),
        outlier_count,
    )

    return raw_listings


def compute_averages(cleaned_listings: list[dict]) -> dict:
    """
    Computes market statistics from clean listings only.
    Returns a dict to be written back to TrackedPart.
    """
    clean = [i for i in cleaned_listings if i.get("is_used_in_avg")]

    if not clean:
        return {
            "avg_sold_price": None,
            "median_sold_price": None,
            "sample_size": 0,
        }

    prices = [i["total_cost"] for i in clean]
    df = pd.Series(prices)

    return {
        "avg_sold_price":    round(df.mean(), 2),
        "median_sold_price": round(df.median(), 2),
        "sample_size":       len(clean),
    }