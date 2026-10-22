from uuid import UUID

from fastapi import APIRouter, Depends

from app.database import get_pool
from app.errors import AppError
from app.security import get_current_user

router = APIRouter()


@router.get("")
def list_tickets(current_user=Depends(get_current_user)):
    with get_pool().connection() as connection:
        tickets = connection.execute(
            """
            SELECT t.ticket_number, t.created_at AS issued_at,
                   e.id AS event_id, e.title AS event_title, e.venue, e.location,
                   e.starts_at, o.id AS order_id
            FROM tickets t
            JOIN events e ON e.id = t.event_id
            JOIN orders o ON o.id = t.order_id
            WHERE t.user_id = %s
            ORDER BY t.created_at DESC
            """,
            (current_user["user_id"],),
        ).fetchall()
    return {"tickets": tickets}


@router.get("/orders/{order_id}")
def get_order(order_id: UUID, current_user=Depends(get_current_user)):
    with get_pool().connection() as connection:
        rows = connection.execute(
            """
            SELECT o.id, o.quantity, o.amount_kes, o.status, o.expires_at, o.created_at,
                   e.id AS event_id, e.title AS event_title, e.starts_at,
                   t.ticket_number
            FROM orders o
            JOIN events e ON e.id = o.event_id
            LEFT JOIN tickets t ON t.order_id = o.id
            WHERE o.id = %s AND o.user_id = %s
            ORDER BY t.ticket_number
            """,
            (order_id, current_user["user_id"]),
        ).fetchall()
    if not rows:
        raise AppError(404, "Order not found")
    first = rows[0]
    order = {
        "id": first["id"],
        "quantity": first["quantity"],
        "amountKes": first["amount_kes"],
        "status": first["status"],
        "expiresAt": first["expires_at"],
        "createdAt": first["created_at"],
        "event": {
            "id": first["event_id"],
            "title": first["event_title"],
            "startsAt": first["starts_at"],
        },
        "tickets": [row["ticket_number"] for row in rows if row["ticket_number"]],
    }
    return {"order": order}
