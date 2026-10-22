# FriendsUp API

FastAPI API for event publishing, attendee accounts, capacity-limited bookings,
M-Pesa checkout, and ticket issuance. PostgreSQL stores application data. The
API manages attendee passwords and issues JWT bearer tokens.

## Requirements

- Python 3.11 or newer
- PostgreSQL 13 or newer
- Safaricom Daraja credentials for M-Pesa checkout

## Local setup

From this directory:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

Set `DATABASE_URL` to a PostgreSQL connection string and configure a random
`JWT_SECRET` of at least 32 characters in `.env`. `MPESA_ENV=sandbox` is the
default. Checkout also requires the Daraja consumer key and secret, shortcode,
passkey, and a publicly reachable callback URL. The API can start without M-Pesa
configuration, but checkout returns an explicit configuration error.

Apply schema migrations, then start the development server:

```bash
python -m app.scripts.migrate
uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

The API listens on port `5000` by default. `GET /health` checks that the process
is running; `GET /health/ready` checks PostgreSQL connectivity. Interactive API
documentation is at `/docs`. The Vite frontend serves on port `8443` by default.

## First administrator

Set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` (minimum 12
characters) in `.env`, then run:

```bash
python -m app.scripts.bootstrap_admin
```

This creates an administrator account or promotes an existing account with the
same email. It does not replace the password of an existing account. Remove the
bootstrap password from the environment after use. Public registration only
creates attendee accounts.

## API overview

All API routes are prefixed with `/api`.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Create an attendee account |
| POST | `/auth/login` | Public | Sign in; returns a bearer token |
| GET | `/auth/me` | Signed in | Get the current account |
| GET | `/events` | Public | List upcoming published events |
| GET | `/events/{eventId}` | Public | Get a published event |
| POST | `/events` | Admin | Create a draft or published event |
| PATCH | `/events/{eventId}` | Admin | Edit, publish, or cancel an event |
| POST | `/mpesa/checkout` | Signed in | Reserve tickets and request an M-Pesa STK push |
| POST | `/mpesa/callback` | Daraja | Verify payment status and issue tickets |
| GET | `/tickets` | Signed in | List the attendee's issued tickets |
| GET | `/tickets/orders/{orderId}` | Order owner | Get payment and ticket status |
| GET | `/dashboard` | Admin | View event totals and recent orders |

Send the bearer token as `Authorization: Bearer <token>`. Checkout accepts
`{ "eventId": "...", "quantity": 1, "phoneNumber": "0712345678" }`; quantity is
capped at 10 per order. PostgreSQL transactions reserve event inventory to
prevent overselling under concurrent checkouts. Pending reservations expire
after ten minutes. If Daraja confirms payment after a reservation expires and
the event has sold out, the order is marked `paid_unfulfilled` for administrator
review.

## Deploy on Railway

1. Push the repository to GitHub and create a Railway project from that
   repository. Add a PostgreSQL service to the project.
2. Create a FastAPI service from the same repository and set its **Root
   Directory** to `/backend`. Railway reads [railway.toml](./railway.toml), runs
   the schema migration before deployment, and starts Uvicorn on Railway's
   `$PORT`.
3. In the API service's Variables, add:
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}` (use Railway's variable picker
     and select the PostgreSQL service's `DATABASE_URL` reference)
   - `JWT_SECRET` set to a random secret of at least 32 characters
   - `FRONTEND_URL` set to the deployed frontend origin
   - `NODE_ENV=production`
   - Optional `MPESA_ENV`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`,
     `MPESA_SHORTCODE`, `MPESA_PASSKEY`, and `MPESA_CALLBACK_URL`
4. Deploy the API and confirm `/health/ready` succeeds. Set the frontend's
   `VITE_API_URL` to the API's public origin, then redeploy the frontend.

Do not commit `.env` files, database URLs, or payment credentials. Railway
provides `DATABASE_URL` to its PostgreSQL service; the API accepts both
`postgres://` and `postgresql://` connection URL schemes.
The migration creates the PostgreSQL schema but does not import documents from
Firestore; export or recreate any data you need before switching services.

## Frontend connection

Set the frontend's `VITE_API_URL` to the deployed API origin and set backend
`FRONTEND_URL` to the exact deployed frontend origin. For local development,
the backend allows `http://localhost:8443`. The frontend's Vite development
server proxies `/api` to `http://127.0.0.1:5000` by default; override
`VITE_API_PROXY_TARGET` if the local API uses another address. Create the first
published event using the admin account and the API docs at `/docs`; the
frontend currently has no event-management interface.
