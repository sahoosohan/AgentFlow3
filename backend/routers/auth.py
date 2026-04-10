# agentflow-api/routers/auth.py
"""
JWT verification middleware.
Sends the token to Supabase to securely retrieve and verify the user.
"""
from fastapi import Depends, HTTPException, Header
from supabase import create_client
from config import settings

def get_current_user(authorization: str = Header(...)) -> str:
    """
    Dependency that extracts the user UUID by verifying the token directly with Supabase.
    Usage: user_id: str = Depends(get_current_user)
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.replace("Bearer ", "")

    try:
        sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        # Securely asks the Supabase Auth server to verify the token
        user_response = sb.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="User not found")
            
        return user_response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
