# agentflow-api/main.py
"""
AgentFlow API — FastAPI entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import upload, documents, reports, monitor

app = FastAPI(
    title="AgentFlow API",
    description="AI Document Processing Backend",
    version="1.0.0",
)

# CORS — allow the Vite dev server and production origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(upload.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(monitor.router, prefix="/api")


@app.get("/")
async def root():
    return {"service": "AgentFlow API", "status": "running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
