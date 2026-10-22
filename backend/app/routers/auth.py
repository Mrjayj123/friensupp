from fastapi import APIRouter, Depends, status

from app.database import get_pool
from app.errors import AppError
from app.schemas import Credentials, Registration
from app.security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(input_data: Registration):
    with get_pool().connection() as connection:
        user = connection.execute(
            """
            INSERT INTO users (name, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING id, name, email, role, created_at
            """,
            (
                input_data.name.strip(),
                str(input_data.email).lower(),
                hash_password(input_data.password),
            ),
        ).fetchone()
    return {"user": user, "token": create_access_token(user)}


@router.post("/login")
def login(input_data: Credentials):
    with get_pool().connection() as connection:
        user = connection.execute(
            """
            SELECT id, name, email, role, password_hash, created_at
            FROM users WHERE email = %s
            """,
            (str(input_data.email).lower(),),
        ).fetchone()
    if not user or not verify_password(input_data.password, user["password_hash"]):
        raise AppError(401, "Email or password is incorrect")
    user.pop("password_hash")
    return {"user": user, "token": create_access_token(user)}


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    with get_pool().connection() as connection:
        user = connection.execute(
            "SELECT id, name, email, role, created_at FROM users WHERE id = %s",
            (current_user["user_id"],),
        ).fetchone()
    if not user:
        raise AppError(401, "Account no longer exists")
    return {"user": user}
