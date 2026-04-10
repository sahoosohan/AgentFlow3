# agentflow-api/routers/documents.py
"""
GET /api/documents               - List the current user's documents.
GET /api/documents/{id}          - Get a single document by ID.
GET /api/documents/{id}/download - Download the original uploaded file.
DELETE /api/documents/{id}       - Delete a document and its generated report.
"""
from io import BytesIO
from typing import List
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from supabase import create_client

from config import settings
from routers.auth import get_current_user
from schemas import DocumentOut

router = APIRouter(tags=["documents"])


def _get_sb():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def _get_document_for_user(sb, doc_id: str, user_id: str):
    result = (
        sb.table("documents")
        .select("*")
        .eq("id", doc_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data


@router.get("/documents", response_model=List[DocumentOut])
async def list_documents(user_id: str = Depends(get_current_user)):
    sb = _get_sb()
    result = (
        sb.table("documents")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/documents/{doc_id}", response_model=DocumentOut)
async def get_document(doc_id: str, user_id: str = Depends(get_current_user)):
    sb = _get_sb()
    document = _get_document_for_user(sb, doc_id, user_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.get("/documents/{doc_id}/download")
async def download_document(doc_id: str, user_id: str = Depends(get_current_user)):
    sb = _get_sb()
    document = _get_document_for_user(sb, doc_id, user_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    storage_path = f"{user_id}/{doc_id}/{document['filename']}"

    try:
        file_bytes = sb.storage.from_("documents").download(storage_path)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Stored file not found") from exc

    encoded_filename = quote(document["filename"])
    headers = {
        "Content-Disposition": (
            f"attachment; filename=\"{document['filename']}\"; "
            f"filename*=UTF-8''{encoded_filename}"
        )
    }

    return StreamingResponse(
        BytesIO(file_bytes),
        media_type="application/octet-stream",
        headers=headers,
    )


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user_id: str = Depends(get_current_user)):
    sb = _get_sb()
    document = _get_document_for_user(sb, doc_id, user_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    storage_path = f"{user_id}/{doc_id}/{document['filename']}"

    sb.table("reports").delete().eq("document_id", doc_id).eq("user_id", user_id).execute()
    sb.table("documents").delete().eq("id", doc_id).eq("user_id", user_id).execute()

    try:
        sb.storage.from_("documents").remove([storage_path])
    except Exception:
        # Keep delete idempotent if the DB row exists but the storage object is already gone.
        pass

    return {"success": True, "id": doc_id}
