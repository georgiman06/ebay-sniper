"""
POST /api/v1/chat  — streaming SSE chat endpoint
--------------------------------------------------
Accepts a conversation history + optional page context.
Returns a Server-Sent Events stream of text deltas.

The frontend consumes this with a ReadableStream / EventSource reader
and appends deltas to the last message in the conversation state.
"""
import logging
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.chat_service import stream_chat
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Chat"])


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    page_context: str | None = None  # e.g. "Sniper feed, viewing AirPods Pro 2"


@router.post("/chat")
async def chat(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Streaming chat endpoint. Returns SSE.

    Each event is a JSON object:
      {"type": "text",     "delta": "..."}    ← append to current message
      {"type": "tool_use", "name": "..."}     ← show thinking indicator
      {"type": "done"}                         ← stream ended cleanly
      {"type": "error",    "message": "..."}  ← surface to user
    """
    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=503,
            detail="Chat feature is not configured. Add ANTHROPIC_API_KEY to server environment.",
        )

    if not body.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")

    # Convert Pydantic models to plain dicts for the Anthropic SDK
    messages = [{"role": m.role, "content": m.content} for m in body.messages]

    async def event_stream() -> AsyncIterator[str]:
        async for chunk in stream_chat(messages, db, body.page_context):
            yield chunk

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disables nginx buffering on Railway
        },
    )
