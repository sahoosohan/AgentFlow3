# agentflow-api/routers/monitor.py
"""
GET /api/monitor/{doc_id}/stream — Server-Sent Events endpoint.
Polls the document's status/progress from Supabase every 2 seconds
and streams updates to the frontend until complete or failed.
"""
import asyncio
import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from supabase import create_client
from config import settings
from routers.auth import get_current_user

router = APIRouter(tags=["monitor"])


@router.get("/monitor/{doc_id}/stream")
async def monitor_stream(doc_id: str, user_id: str = Depends(get_current_user)):
    sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    async def event_generator():
        while True:
            try:
                result = (
                    sb.table("documents")
                    .select("status, progress, error_message, summary, batch_id")
                    .eq("id", doc_id)
                    .eq("user_id", user_id)
                    .maybe_single()
                    .execute()
                )
                doc = result.data
                if not doc:
                    yield f"data: {json.dumps({'error': 'Document not found'})}\n\n"
                    break

                yield f"data: {json.dumps(doc)}\n\n"

                if doc.get("status") in ("complete", "failed"):
                    break
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                break

            await asyncio.sleep(2)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
