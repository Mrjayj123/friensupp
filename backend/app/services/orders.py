from psycopg import Connection

from app.database import get_pool


def expire_pending_orders_for_event(connection: Connection, event_id: str) -> int:
    expired = connection.execute(
        """
        UPDATE orders
        SET status = 'expired', updated_at = NOW()
        WHERE event_id = %s AND status = 'pending' AND expires_at <= NOW()
        RETURNING quantity
        """,
        (event_id,),
    ).fetchall()
    if expired:
        quantity = sum(order["quantity"] for order in expired)
        connection.execute(
            """
            UPDATE events
            SET reserved_tickets = reserved_tickets - %s, updated_at = NOW()
            WHERE id = %s
            """,
            (quantity, event_id),
        )
    return len(expired)


def sweep_expired_orders() -> int:
    with get_pool().connection() as connection:
        event_ids = connection.execute(
            """
            SELECT DISTINCT event_id FROM orders
            WHERE status = 'pending' AND expires_at <= NOW()
            """
        ).fetchall()

    expired_count = 0
    for row in event_ids:
        with get_pool().connection() as connection:
            with connection.transaction():
                connection.execute(
                    "SELECT id FROM events WHERE id = %s FOR UPDATE",
                    (row["event_id"],),
                )
                expired_count += expire_pending_orders_for_event(
                    connection, row["event_id"]
                )
    return expired_count
