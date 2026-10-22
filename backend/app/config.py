from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    node_env: str = "development"
    port: int = 5000
    frontend_url: str = "http://localhost:8443"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/friendsup"
    database_ssl: bool = False
    database_pool_size: int = 20
    jwt_secret: str = ""
    jwt_expires_in: str = "1h"
    mpesa_env: str = "sandbox"
    mpesa_consumer_key: str = ""
    mpesa_consumer_secret: str = ""
    mpesa_shortcode: str = ""
    mpesa_passkey: str = ""
    mpesa_callback_url: str = ""
    bootstrap_admin_email: str = ""
    bootstrap_admin_password: str = ""
    bootstrap_admin_name: str = "FriendsUp Admin"

    @field_validator("port")
    @classmethod
    def validate_port(cls, value: int) -> int:
        if not 1 <= value <= 65535:
            raise ValueError("PORT must be between 1 and 65535")
        return value

    @field_validator("database_pool_size")
    @classmethod
    def validate_pool_size(cls, value: int) -> int:
        if not 1 <= value <= 100:
            raise ValueError("DATABASE_POOL_SIZE must be between 1 and 100")
        return value

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        if value and len(value) < 32:
            raise ValueError("JWT_SECRET must contain at least 32 characters")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
