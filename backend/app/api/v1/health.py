"""
GET /api/v1/health/ebay-auth
----------------------------
A quick smoke-test endpoint to confirm credentials work.
Useful during setup and CI checks.
"""
from fastapi import APIRouter
from app.services.ebay_auth import get_access_token

router = APIRouter()

@router.get("/health")
async def health():
    return {"status": "ok"}

@router.get("/health/ebay-auth")
async def test_ebay_auth():
    try:
        token = await get_access_token()
        # Only return a prefix — never log/expose full tokens
        return {
            "status": "ok",
            "token_preview": f"{token[:12]}...{token[-4:]}",
        }
    except RuntimeError as e:
        return {"status": "error", "detail": str(e)}