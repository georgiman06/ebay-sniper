"""
eBay OAuth2 Client Credentials Flow
------------------------------------
eBay access tokens expire after 2 hours. This service:
  1. Fetches a new token on first call
  2. Caches it in-memory with expiry tracking
  3. Auto-refreshes transparently before expiry
  4. Exposes a single get_access_token() coroutine — callers never manage tokens
"""
import base64
import time
import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# In-memory token cache (sufficient for single-process MVP)
# For multi-process/Azure deployment: migrate to Redis
_token_cache: dict = {
    "access_token": None,
    "expires_at": 0.0,   # Unix timestamp
}


def _build_auth_header() -> str:
    """
    eBay requires credentials as Base64-encoded 'client_id:client_secret'
    in the Authorization header (HTTP Basic Auth style).
    """
    credentials = f"{settings.ebay_client_id}:{settings.ebay_client_secret}"
    encoded = base64.b64encode(credentials.encode("utf-8")).decode("utf-8")
    return f"Basic {encoded}"


async def _fetch_new_token() -> dict:
    """
    Exchanges client credentials for an access token.
    Returns the full token response payload.
    """
    headers = {
        "Authorization": _build_auth_header(),
        "Content-Type": "application/x-www-form-urlencoded",
    }
    # Client Credentials flow only supports the base public scope.
    # Browse API and Finding API are accessible under this scope.
    payload = {
        "grant_type": "client_credentials",
        "scope": "https://api.ebay.com/oauth/api_scope",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            settings.ebay_auth_url,
            headers=headers,
            data=payload,
        )

    if response.status_code != 200:
        logger.error(
            "eBay token fetch failed | status=%s | body=%s",
            response.status_code,
            response.text,
        )
        raise RuntimeError(
            f"eBay OAuth2 failed: {response.status_code} — {response.text}"
        )

    token_data = response.json()
    logger.info(
        "eBay token refreshed | expires_in=%ss", 
        token_data.get("expires_in")
    )
    return token_data


async def get_access_token() -> str:
    """
    Public interface. Returns a valid Bearer token, refreshing if needed.
    
    Usage in any service:
        token = await get_access_token()
        headers = {"Authorization": f"Bearer {token}"}
    """
    now = time.time()
    buffer = settings.token_cache_buffer_seconds

    # Return cached token if still valid (with buffer)
    if _token_cache["access_token"] and now < (_token_cache["expires_at"] - buffer):
        return _token_cache["access_token"]

    # Fetch fresh token
    token_data = await _fetch_new_token()

    # Cache it
    _token_cache["access_token"] = token_data["access_token"]
    _token_cache["expires_at"] = now + int(token_data.get("expires_in", 7200))

    return _token_cache["access_token"]