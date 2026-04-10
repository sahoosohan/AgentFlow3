# agentflow-api/routers/upload.py
"""
POST /api/upload — File upload endpoint.
Stores the file in Supabase Storage, creates a document record,
and dispatches the async Celery processing pipeline.
"""
import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from supabase import create_client
from config import settings
from routers.auth import get_current_user
from schemas import UploadResponse
from tasks.pipeline import run_pipeline

router = APIRouter(tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    # Validate file type
    allowed_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Use PDF or DOCX.",
        )

    doc_id = str(uuid.uuid4())
    batch_id = f"AF-{doc_id[:8].upper()}"

    content = await file.read()

    # Enforce 10 MB limit
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 10 MB limit")

    sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    # Upload file to Supabase Storage
    storage_path = f"{user_id}/{doc_id}/{file.filename}"
    sb.storage.from_("documents").upload(
        storage_path,
        content,
        file_options={"content-type": file.content_type},
    )

    # Insert document record
    sb.table("documents").insert(
        {
            "id": doc_id,
            "user_id": user_id,
            "filename": file.filename,
            "file_size": len(content),
            "status": "processing",
            "progress": 0,
            "batch_id": batch_id,
        }
    ).execute()

    # Dispatch asynchronous Celery pipeline
    run_pipeline.delay(doc_id, user_id, storage_path, batch_id)

    return UploadResponse(doc_id=doc_id, batch_id=batch_id, status="processing")
