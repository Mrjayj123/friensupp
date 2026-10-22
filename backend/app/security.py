from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Any

import bcrypt
import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError

from app.config import get_settings
from app.errors import AppError

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    prehashed = sha256(password.encode("utf-8")).digest()
    return bcrypt.hashpw(prehashed, bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(
            sha256(password.encode("utf-8")).digest(), password_hash.encode("ascii")
        )
    except (ValueError, UnicodeError):
        return False


def _jwt_secret() -> str:
    secret = get_settings().jwt_secret
    if len(secret) < 32:
        raise RuntimeError("JWT_SECRET must contain at least 32 characters")
    return secret


def create_access_token(user: dict[str, Any]) -> str:
    settings = get_settings()
    try:
        expires_delta = _parse_expiration(settings.jwt_expires_in)
    except ValueError as error:
        raise RuntimeError("JWT_EXPIRES_IN must be a duration such as 1h or 30m") from error
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": str(user["id"]),
            "role": user["role"],
            "iat": now,
            "exp": now + expires_delta,
        },
        _jwt_secret(),
        algorithm="HS256",
    )


def _parse_expiration(value: str) -> timedelta:
    if value.isdigit():
        return timedelta(seconds=int(value))
    units = {"s": 1, "m": 60, "h": 3600, "d": 86400}
    if len(value) < 2 or value[-1] not in units or not value[:-1].isdigit():
        raise ValueError("Invalid token expiration")
    return timedelta(seconds=int(value[:-1]) * units[value[-1]])


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    if credentials is None:
        raise AppError(401, "Authentication required")
    try:
        payload = jwt.decode(
            credentials.credentials,
            _jwt_secret(),
            algorithms=["HS256"],
            options={"require": ["sub", "exp"]},
        )
        user_id = payload.get("sub")
        role = payload.get("role")
        if not isinstance(user_id, str) or not isinstance(role, str):
            raise InvalidTokenError("Invalid token payload")
    except (InvalidTokenError, RuntimeError) as error:
        if isinstance(error, RuntimeError):
            raise
        raise AppError(401, "Invalid or expired access token") from error
    return {"user_id": user_id, "role": role}


def require_admin(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if user["role"] != "admin":
        raise AppError(403, "Administrator access required")
    return user
