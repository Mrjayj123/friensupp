from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.database import get_pool
from app.errors import AppError
from app.schemas import EventCreate, EventUpdate
from app.security import require_admin

router = APIRouter()
UPDATE_COLUMNS = {
    "title": "title",
    "description": "description",
    "venue": "venue",
    "location": "location",
    "starts_at": "starts_at",
    "ticket_price_kes": "ticket_price_kes",
    "capacity": "capacity",
    "status": "status",
}


def event_response(event: dict, *, include_available: bool = True) -> dict:
    result = dict(event)
    if include_available:
        result["available_tickets"] = (
            result["capacity"] - result["sold_tickets"] - result["reserved_tickets"]
        )
    return result


@router.get("")
def list_events(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    with get_pool().connection() as connection:
        events = connection.execute(
            """
            SELECT id, title, description, venue, location, starts_at,
                   ticket_price_kes, capacity, sold_tickets, reserved_tickets,
                   status, created_at,
                   capacity - sold_tickets - reserved_tickets AS available_tickets
            FROM events
            WHERE status = 'published' AND starts_at >= NOW()
            ORDER BY starts_at
            LIMIT %s OFFSET %s
            """,
            (limit, offset),
        ).fetchall()
    return {"events": events, "limit": limit, "offset": offset}


@router.post("", status_code=201)
def create_event(input_data: EventCreate, admin=Depends(require_admin)):
    with get_pool().connection() as connection:
        event = connection.execute(
            """
            INSERT INTO events
              (created_by, title, description, venue, location, starts_at,
               ticket_price_kes, capacity, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, title, description, venue, location, starts_at,
                      ticket_price_kes, capacity, sold_tickets, reserved_tickets,
                      status, created_at
            """,
            (
                admin["user_id"],
                input_data.title,
                input_data.description,
                input_data.venue,
                input_data.location,
                input_data.starts_at,
                input_data.ticket_price_kes,
                input_data.capacity,
                input_data.status,
            ),
        ).fetchone()
    return {"event": event}


@router.patch("/{event_id}")
def update_event(
    event_id: UUID,
    input_data: EventUpdate,
    _admin=Depends(require_admin),
):
    changes = input_data.model_dump(exclude_unset=True)
    assignments = []
    values = [event_id]
    for key, value in changes.items():
        assignments.append(f"{UPDATE_COLUMNS[key]} = %s")
        values.append(value)
    assignments.append("updated_at = NOW()")

    with get_pool().connection() as connection:
        with connection.transaction():
            event = connection.execute(
                f"""
                UPDATE events
                SET {", ".join(assignments)}
                WHERE id = %s
                  AND (%s::integer IS NULL OR %s >= sold_tickets + reserved_tickets)
                RETURNING id, title, description, venue, location, starts_at,
                          ticket_price_kes, capacity, sold_tickets, reserved_tickets,
                          status, created_at
                """,
                tuple([*values[1:], event_id, input_data.capacity, input_data.capacity]),
            ).fetchone()
            if not event:
                exists = connection.execute(
                    "SELECT id FROM events WHERE id = %s", (event_id,)
                ).fetchone()
                if not exists:
                    raise AppError(404, "Event not found")
                raise AppError(
                    409,
                    "Capacity cannot be lower than tickets already sold or reserved",
                )
    return {"event": event}


@router.get("/{event_id}")
def get_event(event_id: UUID):
    with get_pool().connection() as connection:
        event = connection.execute(
            """
            SELECT id, title, description, venue, location, starts_at,
                   ticket_price_kes, capacity, sold_tickets, reserved_tickets,
                   status, created_at,
                   capacity - sold_tickets - reserved_tickets AS available_tickets
            FROM events WHERE id = %s AND status = 'published'
            """,
            (event_id,),
        ).fetchone()
    if not event:
        raise AppError(404, "Event not found")
    return {"event": event}
