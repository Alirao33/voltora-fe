# CLAUDE.md — Voltora web

Next.js 16 front end (App Router, React 19, TypeScript strict, Tailwind 3) for Voltora, an EV battery-swap network in Karachi. It has four areas: the public site, a rider app, a driver app and an admin console. It's deployed to Vercel on its own. The FastAPI backend is a separate repo, also on Vercel. `README.md` has the full endpoint-to-screen map.

## Commands

```bash
npm install
npm run dev        # next dev --webpack, http://localhost:3000
npm run build
npm run typecheck  # tsc --noEmit (no lint or test setup exists)
```

Run `npm run typecheck` and `npm run build` before you call a change done.

## Talking to the backend

- The browser calls `/api-proxy/*`. `next.config.mjs` rewrites that to `VOLTORA_API_URL`, which defaults to `http://localhost:8000`, so the backend needs no CORS setup.
- `NEXT_PUBLIC_API_BASE` (optional) makes the browser call the backend directly instead, which means the backend needs `CORS_ORIGINS` set.
- On Vercel, set `VOLTORA_API_URL` to the deployed backend URL. Rewrites are resolved at build time, so redeploy after you change it.
- `.env.local` is gitignored. `.env.example` documents the vars.

## Code layout

```
src/
  lib/api.ts         fetch wrapper: bearer token, one-shot /auth/refresh retry on 401, FastAPI error formatting
  lib/endpoints.ts   one function per backend endpoint, so add new API calls here
  lib/types.ts       types mirroring the backend's Pydantic schemas
  lib/hooks.ts, format.ts
  components/        UI kit (ui.tsx), shells, AuthProvider, AutoView, charts, tables, domain.tsx
  app/(public)/      landing, stations, plans, guest swap
  app/login, register
  app/rider/         rider app
  app/driver/        driver app
  app/admin/login    admin 2-step login (password, then verification code)
  app/admin/(panel)/ guarded admin console
```

`src/app/admin/TELEMETRY/` is outside the guarded `(panel)` group, and its upper-case route name looks accidental. Check with the user before you build on it.

## Conventions

- **Auth:** Tokens live in `localStorage` under `voltora.auth`; see `getTokens`/`setTokens` in `lib/api.ts`. `AuthProvider.tsx` exposes `RequireAuth({ roles })`, a client-side guard, and `homeFor(user)` for redirecting by role. The roles are `ADMIN`, `STATION_ADMIN`, `DRIVER` and `RIDER`. A `STATION_ADMIN` counts as an admin but is scoped to their `station_id`.
- **Untyped backend responses** (quotes, bookings, smart swap, stations, reports and so on) render through `components/AutoView.tsx`, a generic JSON-to-fields/tables view. Field-name guesses for those payloads live in `components/domain.tsx`.
- **Response keys:** the backend returns both `snake_case` and `camelCase` keys. Use `snake_case` to match `types.ts`.
- **Money and time:** amounts are PKR. Times are Karachi (PKT, UTC+5).
- **Styling:** Tailwind only, with the custom `volt` (green brand) and `ink` (neutral) palettes from `tailwind.config.ts`. There's no component library. Charts are hand-rolled SVG (`LineChart.tsx`), and maps are OpenStreetMap embeds. Don't add UI or chart dependencies without asking.
- Use the `@/*` path alias for `src/*`.

## Keeping in sync with the backend

When a backend route or schema changes, update `lib/endpoints.ts`, `lib/types.ts` and the README's endpoint map together. The two repos deploy independently, so don't ship front-end changes that need backend changes that haven't been deployed yet.
