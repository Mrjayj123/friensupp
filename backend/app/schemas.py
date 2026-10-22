from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class RequestModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class Registration(RequestModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value


class Credentials(RequestModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value


class EventCreate(RequestModel):
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=10_000)
    venue: str = Field(min_length=1, max_length=200)
    location: str = Field(default="", max_length=200)
    starts_at: datetime = Field(alias="startsAt")
    ticket_price_kes: int = Field(alias="ticketPriceKes", ge=1, le=1_000_000)
    capacity: int = Field(gt=0, le=100_000)
    status: Literal["draft", "published"] = "draft"

    @field_validator("title", "venue", "location", mode="before")
    @classmethod
    def trim_text_fields(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class EventUpdate(RequestModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=10_000)
    venue: str | None = Field(default=None, min_length=1, max_length=200)
    location: str | None = Field(default=None, max_length=200)
    starts_at: datetime | None = Field(default=None, alias="startsAt")
    ticket_price_kes: int | None = Field(
        default=None, alias="ticketPriceKes", ge=1, le=1_000_000
    )
    capacity: int | None = Field(default=None, gt=0, le=100_000)
    status: Literal["draft", "published", "cancelled"] | None = None

    @field_validator("title", "venue", "location", mode="before")
    @classmethod
    def trim_text_fields(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def require_at_least_one_value(self) -> "EventUpdate":
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update")
        if any(getattr(self, field) is None for field in self.model_fields_set):
            raise ValueError("Updated fields cannot be null")
        return self


class CheckoutRequest(RequestModel):
    event_id: UUID = Field(alias="eventId")
    quantity: int = Field(ge=1, le=10)
    phone_number: str = Field(alias="phoneNumber", min_length=9, max_length=20)


class CallbackMetadataItem(RequestModel):
    name: str = Field(alias="Name")
    value: str | int | float | None = Field(default=None, alias="Value")


class StkCallback(RequestModel):
    merchant_request_id: str = Field(alias="MerchantRequestID")
    checkout_request_id: str = Field(alias="CheckoutRequestID")
    result_code: int = Field(alias="ResultCode")
    result_desc: str = Field(alias="ResultDesc")
    callback_metadata: dict[str, list[CallbackMetadataItem] | None] | None = Field(
        default=None, alias="CallbackMetadata"
    )


class CallbackBody(RequestModel):
    stk_callback: StkCallback = Field(alias="stkCallback")


class MpesaCallback(RequestModel):
    body: CallbackBody = Field(alias="Body")

