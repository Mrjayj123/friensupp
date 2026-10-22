import logging
import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, status

from app.database import get_pool
from app.errors import AppError
from app.schemas import CheckoutRequest, MpesaCallback
from app.security import get_current_user
from app.services.mpesa import (
    confirm_stk_push,
    initiate_stk_push,
    normalize_kenyan_phone_number,
)
from app.services.orders import expire_pending_orders_for_event

logger = logging.getLogger("friendsup.mpesa")
router = APIRouter()
RESERVATION_DURATION = timedelta(minutes=10)


@router.post("/checkout", status_code=status.HTTP_202_ACCEPTED)
def checkout(
    input_data: CheckoutRequest,
    current_user=Depends(get_current_user),
):
    phone_number = normalize_kenyan_phone_number(input_data.phone_number)
    order_id = uuid4()
    now = datetime.now(timezone.utc)

    with get_pool().connection() as connection:
        with connection.transaction():
            event = connection.execute(
                """
                SELECT id, ticket_price_kes, capacity, sold_tickets,
                       reserved_tickets, status, title, starts_at
                FROM events WHERE id = %s FOR UPDATE
                """,
                (input_data.event_id,),
            ).fetchone()
            if (
                not event
                or event["status"] != "published"
                or event["starts_at"] <= now
            ):
                raise AppError(404, "This event is not available for booking")

            expire_pending_orders_for_event(connection, str(event["id"]))
            event = connection.execute(
                """
                SELECT id, ticket_price_kes, capacity, sold_tickets,
                       reserved_tickets, status, title
                FROM events WHERE id = %s
                """,
                (event["id"],),
            ).fetchone()

            total_amount = event["ticket_price_kes"] * input_data.quantity
            if total_amount < 1:
                raise AppError(400, "This event does not have a valid payable ticket price")
            reserved = connection.execute(
                """
                UPDATE events
                SET reserved_tickets = reserved_tickets + %s, updated_at = NOW()
                WHERE id = %s
                  AND capacity - sold_tickets - reserved_tickets >= %s
                RETURNING id
                """,
                (input_data.quantity, event["id"], input_data.quantity),
            ).fetchone()
            if not reserved:
                raise AppError(409, "Not enough tickets are available")
            order = connection.execute(
                """
                INSERT INTO orders
                  (id, user_id, event_id, quantity, amount_kes, phone_number, expires_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, event_id, quantity, amount_kes, status, expires_at,
                          created_at
                """,
                (
                    order_id,
                    current_user["user_id"],
                    event["id"],
                    input_data.quantity,
                    total_amount,
                    phone_number,
                    now + RESERVATION_DURATION,
                ),
            ).fetchone()
            event_title = event["title"]

    response = initiate_stk_push(
        phone_number=phone_number,
        amount_kes=order["amount_kes"],
        account_reference=f"FUP{str(order_id).replace('-', '')[:10]}",
        description=event_title,
    )

    with get_pool().connection() as connection:
        connection.execute(
            """
            UPDATE orders
            SET merchant_request_id = %s, checkout_request_id = %s, updated_at = NOW()
            WHERE id = %s AND status = 'pending'
            """,
            (
                response["MerchantRequestID"],
                response["CheckoutRequestID"],
                order_id,
            ),
        )

    return {
        "message": response.get("CustomerMessage")
        or "Check your phone and enter your M-Pesa PIN to pay.",
        "order": {**order, "status": "pending"},
        "checkoutRequestId": response["CheckoutRequestID"],
    }


@router.post("/callback")
def callback(input_data: MpesaCallback):
    payload = input_data.body.stk_callback
    with get_pool().connection() as connection:
        order = connection.execute(
            """
            SELECT id, event_id, amount_kes, quantity, status, merchant_request_id
            FROM orders WHERE checkout_request_id = %s
            """,
            (payload.checkout_request_id,),
        ).fetchone()
    if not order or order["merchant_request_id"] != payload.merchant_request_id:
        raise AppError(404, "Payment order not found")
    if order["status"] not in {"pending", "expired"}:
        return {"ResultCode": 0, "ResultDesc": "Already processed"}

    payment_confirmed = False
    confirmed = False
    receipt_number = None
    if payload.result_code == 0:
        result = confirm_stk_push(payload.checkout_request_id)
        payment_confirmed = result.get("ResultCode") in (0, "0")
        metadata = (payload.callback_metadata or {}).get("Item") or []
        items = {item.name: item.value for item in metadata}
        receipt_number = items.get("MpesaReceiptNumber")
        confirmed = (
            payment_confirmed
            and items.get("Amount") == order["amount_kes"]
            and bool(receipt_number)
        )
        if payment_confirmed and not confirmed:
            logger.error("M-Pesa callback metadata does not match order %s", order["id"])

    with get_pool().connection() as connection:
        with connection.transaction():
            connection.execute(
                "SELECT id FROM events WHERE id = %s FOR UPDATE",
                (order["event_id"],),
            )
            current = connection.execute(
                """
                SELECT id, event_id, user_id, amount_kes, quantity, status
                FROM orders WHERE id = %s FOR UPDATE
                """,
                (order["id"],),
            ).fetchone()
            if not current or current["status"] not in {"pending", "expired"}:
                return {"ResultCode": 0, "ResultDesc": "Already processed"}

            if not payment_confirmed:
                if current["status"] == "pending":
                    connection.execute(
                        """
                        UPDATE events
                        SET reserved_tickets = reserved_tickets - %s, updated_at = NOW()
                        WHERE id = %s
                        """,
                        (current["quantity"], current["event_id"]),
                    )
                    connection.execute(
                        "UPDATE orders SET status = 'failed', updated_at = NOW() WHERE id = %s",
                        (current["id"],),
                    )
                return {"ResultCode": 0, "ResultDesc": "Accepted"}

            receipt_used = None
            if receipt_number:
                receipt_used = connection.execute(
                    """
                    SELECT id FROM orders
                    WHERE mpesa_receipt_number = %s AND id <> %s
                    """,
                    (receipt_number, current["id"]),
                ).fetchone()
            if not confirmed or receipt_used:
                if current["status"] == "pending":
                    connection.execute(
                        """
                        UPDATE events
                        SET reserved_tickets = reserved_tickets - %s, updated_at = NOW()
                        WHERE id = %s
                        """,
                        (current["quantity"], current["event_id"]),
                    )
                connection.execute(
                    """
                    UPDATE orders
                    SET status = 'paid_unfulfilled', mpesa_receipt_number = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    (None if receipt_used else receipt_number, current["id"]),
                )
                if receipt_used:
                    logger.error("M-Pesa receipt was reused for order %s", current["id"])
                return {"ResultCode": 0, "ResultDesc": "Accepted"}

            if current["status"] == "pending":
                inventory = connection.execute(
                    """
                    UPDATE events
                    SET reserved_tickets = reserved_tickets - %s,
                        sold_tickets = sold_tickets + %s, updated_at = NOW()
                    WHERE id = %s
                    RETURNING id
                    """,
                    (current["quantity"], current["quantity"], current["event_id"]),
                ).fetchone()
            else:
                inventory = connection.execute(
                    """
                    UPDATE events
                    SET sold_tickets = sold_tickets + %s, updated_at = NOW()
                    WHERE id = %s
                      AND capacity - sold_tickets - reserved_tickets >= %s
                    RETURNING id
                    """,
                    (current["quantity"], current["event_id"], current["quantity"]),
                ).fetchone()

            if not inventory:
                connection.execute(
                    """
                    UPDATE orders
                    SET status = 'paid_unfulfilled', mpesa_receipt_number = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    (receipt_number, current["id"]),
                )
                logger.error(
                    "Confirmed M-Pesa payment has no remaining inventory for order %s",
                    current["id"],
                )
                return {"ResultCode": 0, "ResultDesc": "Accepted"}

            connection.execute(
                """
                UPDATE orders
                SET status = 'paid', mpesa_receipt_number = %s, updated_at = NOW()
                WHERE id = %s
                """,
                (receipt_number, current["id"]),
            )
            for _ in range(current["quantity"]):
                ticket_number = f"FUP-{secrets.token_hex(6).upper()}"
                connection.execute(
                    """
                    INSERT INTO tickets (order_id, event_id, user_id, ticket_number)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (
                        current["id"],
                        current["event_id"],
                        current["user_id"],
                        ticket_number,
                    ),
                )

    return {"ResultCode": 0, "ResultDesc": "Accepted"}
