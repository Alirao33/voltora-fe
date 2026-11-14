# Voltora Web

Next.js 16 (App Router, TypeScript, Tailwind) front end for the **Voltora API v2.0.0**: a public site, a rider app, a driver app and an admin console. Every endpoint in the OpenAPI spec is wired up.

## Run it

```bash
npm install
cp .env.example .env.local        # set VOLTORA_API_URL to your FastAPI backend
npm run dev                       # http://localhost:3000
```

Production: `npm run build && npm start`.

The browser calls `/api-proxy/*`, and Next.js forwards those requests to `VOLTORA_API_URL`, so the backend needs no CORS setup. To call the API directly instead, set `NEXT_PUBLIC_API_BASE` (then enable CORS on the backend).

## Who signs in where

| Area | URL | Login |
|---|---|---|
| Public site | `/`, `/stations`, `/plans`, `/swap` | none |
| Rider app | `/rider/*` | `/login` (username/password or phone OTP), `/register` |
| Driver app | `/driver` | `/login`, with a user whose role is `DRIVER` |
| Admin console | `/admin/*` | `/admin/login` (password, then verification code) |

After login, users land on the area that matches their role. To make someone a driver or admin, edit their role under **Admin → Users**, then assign drivers a van under **Vans & routes**.

Tokens live in `localStorage`. On a 401, the client tries `/auth/refresh` once and retries the request before signing the user out.

## Endpoint → screen map

| Endpoint(s) | Screen |
|---|---|
| `POST /register`, `/token`, `/auth/otp/*`, `/auth/refresh`, `GET /users/me` | `/register`, `/login`, auth provider |
| `/auth/admin/login`, `/auth/admin/verify` | `/admin/login` (two steps) |
| `GET /api/guest/stations`, `/plans`; `POST /quote`, `/pay-and-swap` | Landing, Stations (with map), Plans, Quick swap |
| `GET /api/rider/subscription`, `POST /plans/{code}/subscribe` | Rider home, Rider → Plans |
| `POST /api/rider/smart-swap` | Rider home (Smart Swap card) |
| `POST/GET /api/rider/orders`, `GET /orders/{id}`, `/unlock`, `/complete`, `/cancel`, `/rate`, `/receipt` | New swap, My orders, Order detail (full lifecycle) |
| `POST /api/rider/book-locker`, `/bookings/{id}` + `/unlock` `/complete` `/cancel` | Locker bookings |
| `GET /api/driver/me`, `/tasks`; `POST /location`, `/tasks/{id}/confirm`, `/return-to-depot` | Driver → My route (with optional live location sharing) |
| `/api/admin/sites*`, `/lockers*`, `/sites/occupancy` | Admin → Sites & lockers |
| `/api/admin/batteries*`, `/second-life`, `/charging-plan`, `/telemetry/{id}/history` | Admin → Batteries, battery detail with charts |
| `POST /api/telemetry/ingest`, `GET /api/telemetry/{id}/latest` | Admin → Telemetry |
| `/api/admin/orders`, `/payments`, `/payments/{id}/refund` | Admin → Orders, Payments |
| `/api/admin/alerts*` | Admin → Alerts (acknowledge, resolve) |
| `/api/admin/plans*`, `/api/admin/pricing` | Admin → Plans, Pricing engine (with a live quote tester) |
| `/api/admin/vans*`, `/rebalancing/plan`, `/van-tasks*` | Admin → Vans & routes |
| `/api/admin/weather`, `/forecast/*`, `/pilot/run` | Admin → Forecasting |
| `/api/admin/reports/summary`, `/revenue.csv` | Admin → Overview, Reports (CSV download) |
| `/api/admin/audit-logs` | Admin → Audit log |
| `/users`, `/users/{id}`, `/enable`, `/disable` | Admin → Users |
| `/health/ready` | Admin overview status pill |

`/api/payments/webhook` is server-to-server (gateway → backend), so the UI doesn't call it.

## Untyped responses

The spec leaves several response bodies untyped (`{}`): quotes, bookings, Smart Swap, stations/sites, occupancy, rebalancing plans, forecast models, drift, reports and receipts. Those screens render through `src/components/AutoView.tsx`, which lays out any JSON as labelled fields and tables. It formats money, dates and statuses, and every such screen has a "Raw response" toggle. Once your backend's shapes are final, you can swap any `AutoView` for a purpose-built layout.

A few places read common field names from those payloads (for example `charged` / `available` for station stock, `challenge_id` / `dev_code` for admin 2FA, `booking_id` for bookings). They're in `src/components/domain.tsx` and the page files if your names differ.

## Layout

```
src/
  lib/api.ts          fetch wrapper, token refresh, error formatting
  lib/endpoints.ts    one function per API endpoint
  lib/types.ts        types from the OpenAPI schemas
  components/         UI kit, shells, AutoView, charts, tables
  app/(public)/       landing, stations, plans, guest swap
  app/login|register  auth
  app/rider/          rider app
  app/driver/         driver app
  app/admin/login     admin 2FA login
  app/admin/(panel)/  admin console (guarded)
```

No UI libraries beyond Tailwind; charts are hand-rolled SVG, and maps are OpenStreetMap embeds.
