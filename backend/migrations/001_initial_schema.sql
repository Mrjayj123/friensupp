CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(320) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(16) NOT NULL DEFAULT 'attendee'
        CHECK (role IN ('attendee', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES users(id),
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    venue VARCHAR(200) NOT NULL,
    location VARCHAR(200) NOT NULL DEFAULT '',
    starts_at TIMESTAMPTZ NOT NULL,
    ticket_price_kes INTEGER NOT NULL CHECK (ticket_price_kes >= 1),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    sold_tickets INTEGER NOT NULL DEFAULT 0 CHECK (sold_tickets >= 0),
    reserved_tickets INTEGER NOT NULL DEFAULT 0 CHECK (reserved_tickets >= 0),
    status VARCHAR(16) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (sold_tickets + reserved_tickets <= capacity)
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    event_id UUID NOT NULL REFERENCES events(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    amount_kes INTEGER NOT NULL CHECK (amount_kes > 0),
    phone_number VARCHAR(20) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'paid_unfulfilled')),
    expires_at TIMESTAMPTZ NOT NULL,
    merchant_request_id VARCHAR(128),
    checkout_request_id VARCHAR(128) UNIQUE,
    mpesa_receipt_number VARCHAR(64) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    event_id UUID NOT NULL REFERENCES events(id),
    user_id UUID NOT NULL REFERENCES users(id),
    ticket_number VARCHAR(32) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX events_upcoming_published_idx
    ON events (starts_at) WHERE status = 'published';
CREATE INDEX orders_expiration_idx
    ON orders (event_id, expires_at) WHERE status = 'pending';
CREATE INDEX orders_recent_idx ON orders (created_at DESC);
CREATE INDEX orders_user_recent_idx ON orders (user_id, created_at DESC);
CREATE INDEX tickets_user_recent_idx ON tickets (user_id, created_at DESC);
CREATE INDEX tickets_order_idx ON tickets (order_id);
