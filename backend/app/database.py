from collections.abc import Generator
from contextlib import contextmanager

import psycopg
from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.config import get_settings

_pool: ConnectionPool | None = None


def open_pool() -> ConnectionPool:
    global _pool
    settings = get_settings()
    database_url = settings.database_url
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    kwargs = {
        "conninfo": database_url,
        "min_size": 1,
        "max_size": settings.database_pool_size,
        "timeout": 5,
        "kwargs": {"row_factory": dict_row},
        "open": False,
    }
    if settings.database_ssl:
        kwargs["kwargs"]["sslmode"] = "verify-full"
    _pool = ConnectionPool(**kwargs)
    _pool.open(wait=False)
    return _pool


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def get_pool() -> ConnectionPool:
    if _pool is None:
        raise RuntimeError("Database connection pool is not open")
    return _pool


@contextmanager
def transaction() -> Generator[Connection, None, None]:
    with get_pool().connection() as connection:
        with connection.transaction():
            yield connection


def check_database() -> None:
    with get_pool().connection() as connection:
        connection.execute("SELECT 1")


def connect_migration_database():
    settings = get_settings()
    database_url = settings.database_url
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    options = {"sslmode": "verify-full"} if settings.database_ssl else {}
    return psycopg.connect(database_url, autocommit=True, **options)
