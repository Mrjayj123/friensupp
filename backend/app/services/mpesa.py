import base64
import logging
import re
from datetime import datetime
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

import httpx

from app.config import get_settings
from app.errors import AppError

logger = logging.getLogger("friendsup.mpesa")
_token_cache: tuple[str, float] | None = None


def normalize_kenyan_phone_number(phone_number: str) -> str:
    digits = re.sub(r"\D", "", phone_number)
    normalized = f"254{digits[1:]}" if digits.startswith("0") else digits
    if not re.fullmatch(r"254[17]\d{8}", normalized):
        raise AppError(
            400, "Enter a valid Kenyan mobile number, for example 0712345678"
        )
    return normalized


def _configuration() -> dict[str, str]:
    settings = get_settings()
    required = {
        "consumer_key": settings.mpesa_consumer_key,
        "consumer_secret": settings.mpesa_consumer_secret,
        "shortcode": settings.mpesa_shortcode,
        "passkey": settings.mpesa_passkey,
        "callback_url": settings.mpesa_callback_url,
    }
    if not all(required.values()):
        raise AppError(
            503,
            "M-Pesa is not configured. Add Daraja credentials and a public callback URL.",
        )
    if settings.mpesa_env not in {"sandbox", "production"}:
        raise RuntimeError("MPESA_ENV must be sandbox or production")
    callback = urlsplit(settings.mpesa_callback_url)
    if callback.scheme not in {"http", "https"} or not callback.hostname:
        raise RuntimeError("MPESA_CALLBACK_URL must be a valid HTTP or HTTPS URL")
    if settings.mpesa_env == "production" and callback.scheme != "https":
        raise RuntimeError("Production M-Pesa callback URL must use HTTPS")
    required["base_url"] = (
        "https://api.safaricom.co.ke"
        if settings.mpesa_env == "production"
        else "https://sandbox.safaricom.co.ke"
    )
    return required


def _request_json(url: str, **kwargs):
    try:
        response = httpx.post(url, timeout=15, **kwargs)
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, ValueError) as error:
        logger.exception("Daraja request failed")
        raise AppError(502, "M-Pesa service request failed") from error


def _access_token(config: dict[str, str]) -> str:
    global _token_cache
    import time

    if _token_cache and _token_cache[1] > time.monotonic():
        return _token_cache[0]
    credentials = base64.b64encode(
        f"{config['consumer_key']}:{config['consumer_secret']}".encode()
    ).decode("ascii")
    try:
        response = httpx.get(
            f"{config['base_url']}/oauth/v1/generate",
            params={"grant_type": "client_credentials"},
            headers={"Authorization": f"Basic {credentials}"},
            timeout=15,
        )
        response.raise_for_status()
        result = response.json()
    except (httpx.HTTPError, ValueError) as error:
        logger.exception("Daraja token request failed")
        raise AppError(502, "M-Pesa service request failed") from error
    if not result.get("access_token"):
        raise AppError(502, "M-Pesa did not provide an access token")
    ttl = max(0, int(result.get("expires_in", 3600)) - 30)
    _token_cache = (result["access_token"], time.monotonic() + ttl)
    return _token_cache[0]


def _mpesa_timestamp() -> str:
    return datetime.now(ZoneInfo("Africa/Nairobi")).strftime("%Y%m%d%H%M%S")


def _stk_password(config: dict[str, str], timestamp: str) -> str:
    raw = f"{config['shortcode']}{config['passkey']}{timestamp}".encode()
    return base64.b64encode(raw).decode("ascii")


def initiate_stk_push(
    *, phone_number: str, amount_kes: int, account_reference: str, description: str
) -> dict:
    config = _configuration()
    timestamp = _mpesa_timestamp()
    result = _request_json(
        f"{config['base_url']}/mpesa/stkpush/v1/processrequest",
        headers={
            "Authorization": f"Bearer {_access_token(config)}",
            "Content-Type": "application/json",
        },
        json={
            "BusinessShortCode": config["shortcode"],
            "Password": _stk_password(config, timestamp),
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount_kes,
            "PartyA": phone_number,
            "PartyB": config["shortcode"],
            "PhoneNumber": phone_number,
            "CallBackURL": config["callback_url"],
            "AccountReference": account_reference,
            "TransactionDesc": description[:20],
        },
    )
    if not result.get("CheckoutRequestID") or not result.get("MerchantRequestID"):
        raise AppError(502, "M-Pesa did not accept the payment request")
    return result


def confirm_stk_push(checkout_request_id: str) -> dict:
    config = _configuration()
    timestamp = _mpesa_timestamp()
    return _request_json(
        f"{config['base_url']}/mpesa/stkpushquery/v1/query",
        headers={
            "Authorization": f"Bearer {_access_token(config)}",
            "Content-Type": "application/json",
        },
        json={
            "BusinessShortCode": config["shortcode"],
            "Password": _stk_password(config, timestamp),
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id,
        },
    )
