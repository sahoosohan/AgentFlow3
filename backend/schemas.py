# agentflow-api/schemas.py
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


# ── Response Models ──────────────────────────────────────────────

class UploadResponse(BaseModel):
    doc_id: str
    batch_id: str
    status: str


class DocumentOut(BaseModel):
    id: str
    user_id: str
    filename: str
    file_size: Optional[int] = None
    status: str
    progress: int = 0
    summary: Optional[str] = None
    error_message: Optional[str] = None
    batch_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ReportOut(BaseModel):
    id: str
    document_id: str
    user_id: str
    title: Optional[str] = None
    content: Optional[Any] = None
    extraction_accuracy: Optional[float] = None
    created_at: Optional[str] = None


class MonitorEvent(BaseModel):
    status: str
    progress: int
    error_message: Optional[str] = None
