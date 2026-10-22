import sys

from pydantic import EmailStr, TypeAdapter, ValidationError

from app.config import get_settings
from app.database import close_pool, get_pool, open_pool
from app.security import hash_password


def main() -> int:
    settings = get_settings()
    if not settings.bootstrap_admin_email or len(settings.bootstrap_admin_password) < 12:
        print(
            "Set BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD "
            "of at least 12 characters",
            file=sys.stderr,
        )
        return 1
    try:
        email = TypeAdapter(EmailStr).validate_python(
            settings.bootstrap_admin_email.strip().lower()
        )
    except ValidationError:
        print("BOOTSTRAP_ADMIN_EMAIL must be a valid email address", file=sys.stderr)
        return 1

    open_pool()
    try:
        with get_pool().connection() as connection:
            with connection.transaction():
                user = connection.execute(
                    """
                    UPDATE users
                    SET role = 'admin', updated_at = NOW()
                    WHERE email = %s
                    RETURNING id
                    """,
                    (str(email),),
                ).fetchone()
                if not user:
                    connection.execute(
                        """
                        INSERT INTO users (name, email, password_hash, role)
                        VALUES (%s, %s, %s, 'admin')
                        """,
                        (
                            settings.bootstrap_admin_name.strip(),
                            str(email),
                            hash_password(settings.bootstrap_admin_password),
                        ),
                    )
    finally:
        close_pool()
    print(f"Administrator access enabled for {email}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
