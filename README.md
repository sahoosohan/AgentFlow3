# AgentFlow3

This workspace is organized so the frontend and backend are easier to work with independently.

## Structure

- `frontend/`: Vite + React application
- `backend/`: FastAPI backend and Celery worker
- `supabase-schema.sql`: database schema for Supabase
- `.agents/`, `.vscode/`: local tooling and editor settings

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Backend API

```powershell
cd backend
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

## Celery Worker

```powershell
cd backend
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
celery -A tasks.pipeline worker --loglevel=info --pool=solo
```

## Redis

```powershell
docker run -d -p 6379:6379 redis
```

## Docker

This repo now includes production-style container files for:

- `frontend/`: React app served by Nginx
- `backend/`: FastAPI API
- `worker`: Celery worker using the same backend image
- `redis`: Redis broker/result backend

### Required env files

If you do not already have them, create these files:

```powershell
Copy-Item frontend\.env.example frontend\.env
Copy-Item backend\.env.example backend\.env
```

Then fill in the real values:

- `frontend/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `backend/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`, `GEMINI_API_KEY`

`REDIS_URL` is automatically overridden inside Docker to use the Redis container.

### Run The Full Stack

From the repo root:

```powershell
docker compose up --build
```

For detached mode:

```powershell
docker compose up --build -d
```

Services:

- Frontend: `http://localhost`
- Backend health: proxied through `http://localhost/health`
- Backend API: proxied through `http://localhost/api/...`

### Stop The Stack

```powershell
docker compose down
```

To also remove Redis data:

```powershell
docker compose down -v
```

## Deploy

The current setup is ready for a single-server Docker deployment.

Basic flow:

1. Install Docker and Docker Compose on your server.
2. Copy this repo to the server.
3. Create `frontend/.env` and `backend/.env` with production values.
4. Run:

```powershell
docker compose up --build -d
```

5. Point your domain to the server and expose port `80`.

Notes:

- The frontend container reverse-proxies `/api` to the backend container, so the app can run behind a single public URL.
- The frontend reads its env values at container startup, which makes deployment easier than hardcoding them at build time.
- If you later deploy frontend and backend as separate services, set `VITE_API_URL` to the public backend URL instead of `/api`.
