import asyncio
import logging
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timezone
from threading import Lock

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import check_database, close_pool, open_pool
from app.errors import register_error_handlers
from app.routers import auth, dashboard, events, mpesa, tickets
from app.services.orders import sweep_expired_orders

logger = logging.getLogger("friendsup")

RATE_WINDOW_SECONDS = 15 * 60
RATE_LIMIT = 1000
_rate_lock = Lock()
_rate_events: dict[str, deque[float]] = defaultdict(deque)

# Paths exempt from CORS header blocking and in-memory rate limits (e.g., webhook callbacks)
UNRESTRICTED_PATHS = {
    "/api/mpesa/callback",
}


async def _expire_orders_loop() -> None:
    while True:
        await asyncio.sleep(60)
        try:
            await asyncio.to_thread(sweep_expired_orders)
        except Exception:
            logger.exception("Could not expire pending ticket reservations")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    if len(settings.jwt_secret) < 32:
        raise RuntimeError("JWT_SECRET must contain at least 32 characters")
    open_pool()
    expiry_task = asyncio.create_task(_expire_orders_loop())
    try:
        yield
    finally:
        expiry_task.cancel()
        with suppress(asyncio.CancelledError):
            await expiry_task
        close_pool()


app = FastAPI(title="FriendsUp API", version="1.0.0", lifespan=lifespan)
settings = get_settings()

allowed_origins = [
    origin.strip() for origin in settings.frontend_url.split(",") if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

register_error_handlers(app)


@app.middleware("http")
async def security_and_rate_limit(request: Request, call_next):
    client_host = request.client.host if request.client else "unknown"
    now = time.monotonic()
    origin = request.headers.get("origin")
    path = request.url.path

    # Bypass Origin checks and Rate Limits for webhook endpoints like M-Pesa callbacks
    if path in UNRESTRICTED_PATHS:
        response = await call_next(request)
    else:
        if origin and origin not in allowed_origins:
            response = JSONResponse(
                status_code=403, content={"error": "Origin is not allowed by CORS"}
            )
        else:
            with _rate_lock:
                events = _rate_events[client_host]
                while events and now - events[0] >= RATE_WINDOW_SECONDS:
                    events.popleft()

                # Clean up memory if tracking over 10,000 active IPs
                if len(_rate_events) > 10_000:
                    for host, host_events in list(_rate_events.items()):
                        while (
                            host_events
                            and now - host_events[0] >= RATE_WINDOW_SECONDS
                        ):
                            host_events.popleft()
                        if not host_events:
                            _rate_events.pop(host, None)
                    events = _rate_events[client_host]

                if len(events) >= RATE_LIMIT:
                    response = JSONResponse(
                        status_code=429,
                        content={
                            "error": "Too many requests, please try again later."
                        },
                    )
                else:
                    events.append(now)
                    response = None

        if response is None:
            response = await call_next(request)

    # Security Headers
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("X-Permitted-Cross-Domain-Policies", "none")
    response.headers.setdefault("Cross-Origin-Resource-Policy", "same-origin")

    if settings.node_env == "production":
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )

    return response


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc)}


@app.get("/health/ready")
def readiness():
    check_database()
    return {"status": "ready", "timestamp": datetime.now(timezone.utc)}


# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(tickets.router, prefix="/api/tickets", tags=["tickets"])
app.include_router(mpesa.router, prefix="/api/mpesa", tags=["payments"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])