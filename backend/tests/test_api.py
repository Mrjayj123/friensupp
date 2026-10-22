import os

import pytest

os.environ.setdefault("JWT_SECRET", "test-secret-with-at-least-32-characters")

from fastapi.testclient import TestClient

from app.errors import AppError
from app.main import app
from app.routers.events import event_response
from app.schemas import EventCreate, EventUpdate, MpesaCallback, Registration
from app.security import hash_password, verify_password
from app.services.mpesa import normalize_kenyan_phone_number


def test_health_endpoint():
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_protected_ticket_route_requires_authentication():
    response = TestClient(app).get("/api/tickets")
    assert response.status_code == 401
    assert response.json() == {"error": "Authentication required"}


def test_openapi_schema_is_available():
    response = TestClient(app).get("/openapi.json")
    assert response.status_code == 200
    assert "/api/mpesa/checkout" in response.json()["paths"]


def test_disallowed_cors_origin_is_rejected():
    response = TestClient(app).get(
        "/health", headers={"Origin": "https://untrusted.example"}
    )
    assert response.status_code == 403
    assert response.json() == {"error": "Origin is not allowed by CORS"}


def test_request_validation_uses_api_error_envelope():
    response = TestClient(app).post("/api/auth/register", json={})
    assert response.status_code == 400
    assert response.json()["error"] == "Invalid request"
    assert response.json()["details"]


def test_event_request_accepts_frontend_camel_case():
    event = EventCreate.model_validate(
        {
            "title": "Community night",
            "venue": "FriendsUp Hall",
            "startsAt": "2030-01-01T18:00:00Z",
            "ticketPriceKes": 500,
            "capacity": 150,
        }
    )
    assert event.ticket_price_kes == 500
    assert event.capacity == 150


def test_event_response_reports_available_inventory():
    response = event_response(
        {
            "id": "event-id",
            "capacity": 150,
            "sold_tickets": 40,
            "reserved_tickets": 10,
        }
    )
    assert response["available_tickets"] == 100


def test_event_update_requires_fields_and_rejects_null_values():
    try:
        EventUpdate.model_validate({})
    except ValueError as error:
        assert "at least one field" in str(error)
    else:
        raise AssertionError("empty event patch should be rejected")

    try:
        EventUpdate.model_validate({"title": None})
    except ValueError as error:
        assert "cannot be null" in str(error)
    else:
        raise AssertionError("null event patch value should be rejected")


def test_mpesa_callback_accepts_daraja_payload():
    callback = MpesaCallback.model_validate(
        {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "merchant-request",
                    "CheckoutRequestID": "checkout-request",
                    "ResultCode": 0,
                    "ResultDesc": "The service request is processed successfully.",
                    "CallbackMetadata": {
                        "Item": [
                            {"Name": "Amount", "Value": 500},
                            {"Name": "MpesaReceiptNumber", "Value": "ABC123"},
                        ]
                    },
                }
            }
        }
    )
    items = callback.body.stk_callback.callback_metadata["Item"]
    assert {item.name: item.value for item in items} == {
        "Amount": 500,
        "MpesaReceiptNumber": "ABC123",
    }


def test_registration_normalizes_email_and_trims_name():
    attendee = Registration.model_validate(
        {"name": "  Ada  ", "email": "ADA@example.com", "password": "very-long-password"}
    )
    assert attendee.name == "Ada"
    assert str(attendee.email) == "ada@example.com"


def test_password_hash_supports_long_unicode_passwords():
    password = "pāssword-" * 12
    assert verify_password(password, hash_password(password))
    assert not verify_password(password + "wrong", hash_password(password))


def test_kenyan_phone_normalization_and_validation():
    assert normalize_kenyan_phone_number("0712 345 678") == "254712345678"
    assert normalize_kenyan_phone_number("+254 112 345 678") == "254112345678"
    with pytest.raises(AppError, match="valid Kenyan mobile number"):
        normalize_kenyan_phone_number("5551234")
