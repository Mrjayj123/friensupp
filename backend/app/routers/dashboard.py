from fastapi import APIRouter, Depends

from app.database import get_pool
from app.security import require_admin

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("")
def dashboard():
    with get_pool().connection() as connection:
        summary = connection.execute(
            """
            SELECT COUNT(*) FILTER (WHERE status = 'published')::integer AS published_events,
                   COALESCE(SUM(sold_tickets), 0)::integer AS tickets_sold,
                   COALESCE(SUM(reserved_tickets), 0)::integer AS tickets_reserved,
                   (SELECT COUNT(*)::integer FROM orders
                    WHERE status = 'paid_unfulfilled') AS payments_needing_review
            FROM events
            """
        ).fetchone()
        recent_orders = connection.execute(
            """
            SELECT o.id, o.quantity, o.amount_kes, o.status, o.created_at,
                   e.title AS event_title, u.name AS attendee_name
            FROM orders o
            JOIN events e ON e.id = o.event_id
            JOIN users u ON u.id = o.user_id
            ORDER BY o.created_at DESC
            LIMIT 20
            """
        ).fetchall()
    return {"summary": summary, "recentOrders": recent_orders}
