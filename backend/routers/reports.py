# agentflow-api/routers/reports.py
"""
GET /api/reports/{doc_id} — Get the report generated for a document.
"""
from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client
from config import settings
from routers.auth import get_current_user
from schemas import ReportOut

router = APIRouter(tags=["reports"])


@router.get("/reports/{doc_id}", response_model=ReportOut)
async def get_report(doc_id: str, user_id: str = Depends(get_current_user)):
    sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    result = (
        sb.table("reports")
        .select("*")
        .eq("document_id", doc_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Report not found")
    return result.data
