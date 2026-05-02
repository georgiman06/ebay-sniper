"""
Chat Service — Claude-powered assistant for SNIPER
----------------------------------------------------
This bot is a domain expert, not a general-purpose assistant.
It knows:
  - Exactly how max_buy_price, margin_pct, and IQR outlier detection work
  - Where the data comes from (Playwright scraper → ScraperAPI → Browse API)
  - The user's live tracked parts, active deals, price history, quota status
  - How to reason about flipping strategy in plain English

Tool use pattern:
  The bot calls our own internal API functions to fetch live data before
  answering. This means every answer is grounded in the user's actual numbers,
  not generic advice.

Prompt caching:
  The large system prompt is marked as cacheable (cache_control: ephemeral).
  After the first call, Anthropic serves it from cache at ~10% of normal cost.
  With a large system prompt (~1500 tokens), this cuts per-turn cost ~40%.
"""
from __future__ import annotations

import json
import logging
from typing import AsyncIterator

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.part import TrackedPart
from app.models.active_listing import ActiveListing
from app.models.price_history import SoldListing
from app.services.quota_tracker import get_status as get_quota_status

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-6"

# ─── System prompt ────────────────────────────────────────────────────────────
# This is cached on Anthropic's side after the first call per session.
# Keep it detailed — the more the bot knows about the app, the less it hallucinates.

SYSTEM_PROMPT = """You are SNIPER Assistant, an embedded expert for the SNIPER eBay Deal Finder app.

## Your role
You help users — eBay resellers and flippers — understand their data, interpret results, and make smarter buying decisions. You have access to their live data through tools and can answer questions about specific parts they're tracking.

## The app — what it does
SNIPER finds profitable eBay deals by:
1. Scraping recently SOLD eBay listings to establish a fair market value (avg_sold_price)
2. Computing a max_buy_price based on the user's target margin
3. Monitoring live active listings via Browse API to flag deals below max_buy_price
4. Refreshing data twice daily (6 AM and 6 PM ET) plus on-demand

## Key formulas — know these cold

**max_buy_price** = avg_sold_price × (1 − target_margin)
  Example: avg=$100, margin=30% → max_buy = $100 × 0.70 = $70
  "If you pay $70 and sell for $100, you keep $30 = 30% margin"

**margin_pct** = (avg_sold_price − total_cost) / avg_sold_price × 100
  Example: avg=$100, cost=$65 → margin = (100-65)/100 × 100 = 35%

**estimated_profit** = avg_sold_price − total_cost
  total_cost = current_price + shipping_cost

**is_deal** = total_cost ≤ max_buy_price (boolean flag, pre-computed at ingest)

**effective_margin**: uses per-part target_margin_override if set, otherwise the global 30% default

## Data quality — IQR outlier detection
Sold listings go through a 3-pass cleaner before computing averages:
1. Title exclusions — rejects listings with "lot", "bundle", "for parts", "broken", "damaged" etc.
2. Strict token matching — listing title must contain the core query terms
3. IQR bounds — outliers outside [Q1 − 1.5×IQR, Q3 + 1.5×IQR] are flagged (is_outlier=True)

Only is_used_in_avg=True listings count toward avg_sold_price.
Users can trust the average — garbage is excluded before it gets in.

## Data sources
- **Sold listings**: Playwright web scraper hitting eBay's completed sales page, routed through ScraperAPI (residential proxies) to bypass bot detection. Cached 24h per query.
- **Active listings**: eBay Browse API (official OAuth). Searches for used/refurbished items up to 110% of max_buy_price.
- **Conditions tracked**: Used, Very Good, Good, Acceptable, Seller Refurbished

## Quota system
- eBay Browse API: 5,000 calls/day (resets 00:00 UTC)
- ScraperAPI: 1,000 calls/month
- At 70%+ usage, background refreshes throttle automatically
- At 100%, calls return gracefully without crashing

## Tone and style
- Be direct and specific. Use the user's actual numbers, not hypotheticals.
- When explaining a formula, show the arithmetic with their real values.
- If data is missing (no sold history yet), say so honestly — don't fabricate numbers.
- Keep responses concise. Users are decision-makers, not students.
- Don't lecture about eBay basics they already know. They're flippers.
- If a user proposes a strategy, engage with it seriously using their data.

## What you are NOT
- Not a general eBay marketplace advisor
- Not a price negotiation coach
- Not a forecasting tool (the DB is too new for statistical forecasting)
- Not a customer support agent for eBay itself

Always use your tools to fetch live data before answering questions about specific parts.
"""

# ─── Tool definitions ─────────────────────────────────────────────────────────

TOOLS: list[anthropic.types.ToolParam] = [
    {
        "name": "list_parts",
        "description": "Lists all tracked parts for this user — name, category, avg sold price, max buy price, last refreshed. Use this to answer 'what am I tracking?' or to find a part_id before calling other tools.",
        "input_schema": {
            "type": "object",
            "properties": {
                "active_only": {
                    "type": "boolean",
                    "description": "If true, only return active (is_active=True) parts. Default true.",
                }
            },
            "required": [],
        },
    },
    {
        "name": "get_deals",
        "description": "Returns the current sniper feed — live active listings sorted by margin. Use this to answer 'what deals do I have right now?' or to show the best buying opportunities.",
        "input_schema": {
            "type": "object",
            "properties": {
                "part_id": {
                    "type": "string",
                    "description": "UUID of a specific part. Omit to get deals across all parts.",
                },
                "deals_only": {
                    "type": "boolean",
                    "description": "If true, only return listings where is_deal=True (total_cost ≤ max_buy_price). Default true.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_price_history",
        "description": "Returns the sold listing history for a specific part — individual sales with prices, dates, conditions. Use this to answer questions about price trends, data quality, or why the average is what it is.",
        "input_schema": {
            "type": "object",
            "properties": {
                "part_id": {
                    "type": "string",
                    "description": "UUID of the part. Required.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max number of recent sales to return. Default 20.",
                },
            },
            "required": ["part_id"],
        },
    },
    {
        "name": "get_quota_status",
        "description": "Returns current API quota usage for eBay Browse API and ScraperAPI. Use this when users ask about rate limits, why refreshes might be slow, or the API health.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
]


# ─── Tool execution ────────────────────────────────────────────────────────────

async def _execute_tool(name: str, tool_input: dict, db: AsyncSession) -> str:
    """Runs the tool and returns a JSON string result."""
    try:
        if name == "list_parts":
            active_only = tool_input.get("active_only", True)
            q = select(TrackedPart)
            if active_only:
                q = q.where(TrackedPart.is_active == True)
            q = q.order_by(TrackedPart.created_at.desc())
            result = await db.execute(q)
            parts = result.scalars().all()
            margin = settings.global_default_margin
            data = [
                {
                    "id": str(p.id),
                    "name": p.name,
                    "category": p.category,
                    "search_query": p.search_query,
                    "avg_sold_price": p.avg_sold_price,
                    "max_buy_price": round(p.avg_sold_price * (1 - (p.target_margin_override or margin)), 2) if p.avg_sold_price else None,
                    "effective_margin": f"{int((p.target_margin_override or margin) * 100)}%",
                    "sample_size": p.sample_size,
                    "last_refreshed_at": str(p.last_refreshed_at) if p.last_refreshed_at else None,
                    "is_active": p.is_active,
                }
                for p in parts
            ]
            return json.dumps({"parts": data, "count": len(data)})

        elif name == "get_deals":
            part_id = tool_input.get("part_id")
            deals_only = tool_input.get("deals_only", True)
            q = select(ActiveListing)
            if part_id:
                from uuid import UUID
                q = q.where(ActiveListing.part_id == UUID(part_id))
            if deals_only:
                q = q.where(ActiveListing.is_deal == True)
            q = q.order_by(ActiveListing.margin_pct.desc()).limit(20)
            result = await db.execute(q)
            listings = result.scalars().all()
            data = [
                {
                    "title": l.title,
                    "current_price": l.current_price,
                    "shipping_cost": l.shipping_cost,
                    "total_cost": l.total_cost,
                    "condition": l.condition,
                    "listing_type": l.listing_type,
                    "max_buy_price": l.max_buy_price,
                    "estimated_profit": l.estimated_profit,
                    "margin_pct": l.margin_pct,
                    "is_deal": l.is_deal,
                    "listing_url": l.listing_url,
                }
                for l in listings
            ]
            return json.dumps({"listings": data, "count": len(data)})

        elif name == "get_price_history":
            from uuid import UUID
            part_id = UUID(tool_input["part_id"])
            limit = tool_input.get("limit", 20)
            q = (
                select(SoldListing)
                .where(SoldListing.part_id == part_id)
                .order_by(SoldListing.sold_date.desc())
                .limit(limit)
            )
            result = await db.execute(q)
            sales = result.scalars().all()
            data = [
                {
                    "title": s.title,
                    "sold_price": s.sold_price,
                    "shipping_cost": s.shipping_cost,
                    "total_cost": s.total_cost,
                    "condition": s.condition,
                    "sold_date": str(s.sold_date)[:10],
                    "is_outlier": s.is_outlier,
                    "outlier_reason": s.outlier_reason,
                    "is_used_in_avg": s.is_used_in_avg,
                }
                for s in sales
            ]
            return json.dumps({"sales": data, "count": len(data)})

        elif name == "get_quota_status":
            status = await get_quota_status()
            return json.dumps(status)

        else:
            return json.dumps({"error": f"Unknown tool: {name}"})

    except Exception as e:
        logger.error("Tool %s failed: %s", name, e)
        return json.dumps({"error": str(e)})


# ─── Main streaming function ───────────────────────────────────────────────────

async def stream_chat(
    messages: list[dict],
    db: AsyncSession,
    page_context: str | None = None,
) -> AsyncIterator[str]:
    """
    Yields Server-Sent Events strings for the frontend to consume.

    Event types:
      data: {"type": "text", "delta": "..."}       ← streamed text chunk
      data: {"type": "tool_use", "name": "..."}    ← tool being called (UX indicator)
      data: {"type": "done"}                        ← stream complete
      data: {"type": "error", "message": "..."}    ← something went wrong
    """
    if not settings.anthropic_api_key:
        yield f"data: {json.dumps({'type': 'error', 'message': 'ANTHROPIC_API_KEY is not configured on the server.'})}\n\n"
        return

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    # Build context injection if the frontend passed page context
    system_with_context = SYSTEM_PROMPT
    if page_context:
        system_with_context += f"\n\n## Current page context\nThe user is currently on: {page_context}"

    # Agentic loop — run until the model stops calling tools
    current_messages = list(messages)
    max_iterations = 5  # prevent runaway tool loops

    for iteration in range(max_iterations):
        try:
            # Use prompt caching on the system prompt — after first call this costs
            # ~10% of normal input token price for the system prompt portion.
            async with client.messages.stream(
                model=MODEL,
                max_tokens=1024,
                system=[
                    {
                        "type": "text",
                        "text": system_with_context,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                tools=TOOLS,
                messages=current_messages,
            ) as stream:
                # Collect the full response while streaming text to the client
                tool_calls: list[dict] = []
                current_tool: dict | None = None
                current_tool_input_str = ""

                async for event in stream:
                    if event.type == "content_block_start":
                        if event.content_block.type == "tool_use":
                            current_tool = {
                                "id": event.content_block.id,
                                "name": event.content_block.name,
                            }
                            current_tool_input_str = ""
                            # Tell frontend which tool is running (for a "thinking" indicator)
                            yield f"data: {json.dumps({'type': 'tool_use', 'name': event.content_block.name})}\n\n"

                    elif event.type == "content_block_delta":
                        if event.delta.type == "text_delta":
                            yield f"data: {json.dumps({'type': 'text', 'delta': event.delta.text})}\n\n"
                        elif event.delta.type == "input_json_delta":
                            current_tool_input_str += event.delta.partial_json

                    elif event.type == "content_block_stop":
                        if current_tool is not None:
                            try:
                                tool_input = json.loads(current_tool_input_str) if current_tool_input_str else {}
                            except json.JSONDecodeError:
                                tool_input = {}
                            current_tool["input"] = tool_input
                            tool_calls.append(current_tool)
                            current_tool = None
                            current_tool_input_str = ""

                final_message = await stream.get_final_message()

            # If the model didn't call any tools, we're done
            if final_message.stop_reason != "tool_use" or not tool_calls:
                break

            # Execute all tool calls and build the tool result message
            tool_results = []
            for tool_call in tool_calls:
                result_content = await _execute_tool(
                    tool_call["name"], tool_call.get("input", {}), db
                )
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_call["id"],
                    "content": result_content,
                })

            # Append assistant turn + tool results to conversation history
            current_messages.append({"role": "assistant", "content": final_message.content})
            current_messages.append({"role": "user", "content": tool_results})

        except anthropic.APIStatusError as e:
            logger.error("Anthropic API error: %s", e)
            yield f"data: {json.dumps({'type': 'error', 'message': f'AI service error: {e.status_code}'})}\n\n"
            return
        except Exception as e:
            logger.error("Chat stream error: %s", e)
            yield f"data: {json.dumps({'type': 'error', 'message': 'Something went wrong. Please try again.'})}\n\n"
            return

    yield f"data: {json.dumps({'type': 'done'})}\n\n"
