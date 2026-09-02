"""Supabase JWT verification for FastAPI routes.

Uses the Supabase JWT secret to verify tokens sent from the frontend.
If no JWT secret is configured, auth is optional (no enforcement).
"""

import logging
import time
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


class AuthUser:
    def __init__(self, uid: str, email: str, role: str = "authenticated"):
        self.uid = uid
        self.email = email
        self.role = role


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[AuthUser]:
    if not credentials:
        return None

    token = credentials.credentials

    if not settings.SUPABASE_JWT_SECRET:
        try:
            import jwt as pyjwt
            payload = pyjwt.decode(
                token,
                options={"verify_signature": False, "verify_aud": False, "verify_exp": True},
            )
            uid = payload.get("sub")
            email = payload.get("email", "")
            if uid:
                return AuthUser(uid=uid, email=email)
        except Exception:
            pass
        return None

    try:
        import jwt as pyjwt
        payload = pyjwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )

        exp = payload.get("exp", 0)
        if exp and exp < time.time():
            return None

        uid = payload.get("sub")
        email = payload.get("email", "")
        role = payload.get("role", "")

        if not uid:
            return None

        return AuthUser(uid=uid, email=email, role=role)

    except Exception:
        logger.warning("invalid_jwt_token")
        return None


async def require_auth(
    user: Optional[AuthUser] = Depends(get_current_user),
) -> AuthUser:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return user
