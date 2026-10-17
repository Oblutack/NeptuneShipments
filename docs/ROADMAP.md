# NeptuneOS Roadmap

[← Back to README](../README.md)

This roadmap comes from a full scan of the codebase (backend, frontend,
migrations, CI, Docker, seed data). Phase 0 covers real defects found in
that scan and should come before any new features. The phases after it
are ordered so each one builds on the one before.

Effort is a rough guide: **S** = under a day, **M** = 1–3 days, **L** = about a week.

---

## Phase 0 — Fix what the scan found

### Security / access control

- [ ] **Stop CLIENT accounts reading company financials and crew data** — **S**
  - `/api/finance/stats`, `/api/finance/revenue-trend` and `/api/crew` sit behind `requireAuth` only (`backend/cmd/api/main.go`), and neither handler checks the role.
  - Fix: add `requireAdmin` to the finance group and `GET /crew`. `GET /vessels/:id/crew` needs the same treatment.
  - Done when: a CLIENT token gets 403 on all of them, covered by a handler test like `TestCreateShipment_ClientCannotDispatchAVessel`.

- [ ] **Return only public fields from public tracking** — **S**
  - `GetShipmentByTracking` (`internal/handlers/shipment_handler.go`) returns the full `models.Shipment`: customer name, `customer_user_id`, manifest line values and IMDG classes.
  - Fix: a dedicated `PublicShipmentView` DTO with tracking number, status, origin/destination port names and ETA only.
  - Done when: an unauthenticated response has no customer or manifest fields in it.

- [ ] **Generate tracking numbers on the server** — **S**
  - Users currently type tracking numbers in free text (`ShipmentForm.tsx`), so they're guessable and can collide.
  - Fix: generate a non-sequential ID on the server (e.g. `NEP-` + 10 random base32 characters) and drop the form field.
  - Done when: a client-supplied `tracking_number` is ignored, and a migration keeps existing rows valid.

- [ ] **Limit Bill of Lading downloads to the shipment's owner** — **S**
  - `DownloadBOL` lets any authenticated user download any shipment's BOL by tracking number.
  - Fix: allow ADMIN, or a CLIENT whose `customer_user_id` matches the shipment.

- [ ] **Encrypt TOTP secrets at rest** — **M**
  - `users.totp_secret` is plaintext (`000024_add_totp_to_users`).
  - Fix: AES-GCM using a key from `TOTP_ENCRYPTION_KEY`; fail fast in production if it's missing (same pattern as `JWT_SECRET`); migrate existing rows.

- [ ] **Protect `/api/routes/calculate`** — **S**
  - It's public and runs a pgRouting query on every call.
  - Fix: require auth, or give it its own tighter limiter keyed by IP.

### Simulation correctness

- [ ] **Make voyage duration match distance and speed** — **M**
  - `engine.go` adds a fixed `0.002` progress per tick, so every voyage takes about 42 minutes whatever its length. The ETA (`UpdateETAForVessel`) uses real distance and speed, so the ETA and the actual arrival disagree.
  - Fix: `increment = distanceThisTickNM / routeLengthNM`, with the route length cached per route.
  - Done when: a simulator test shows a route twice as long takes twice as many ticks, and the ETA agrees with actual arrival within one tick.

- [ ] **Scale fuel burn by vessel** — **S**
  - Every ship burns `0.5 × (speed / 20)` per tick, and free-roaming ships burn none.
  - Fix: a per-vessel design consumption at service speed, scaled by the cube of speed (see Phase 2), applied in both movement strategies.

- [ ] **Persist alerts** — **M**
  - `alertsSent` lives only in memory, so alert history is lost on refresh or restart.
  - Fix: an `alerts` table (level, vessel, message, acknowledged_by, acknowledged_at), a `GET /api/alerts` endpoint, and acknowledge/resolve from the AlertFeed.

---

## Phase 1 — Platform foundations

These make every later phase cheaper and easier to demo.

- [ ] **Push live updates instead of polling** — **M**
  - Pages poll every 2–5 s (`App.tsx` MapPage, `FleetPage`, `MapCommandDeck`, `MaintenancePage`, `FinancePage`, `CrewPage`), even though `/ws/fleet` already sends `FLEET_UPDATE`.
  - Fix: RTK Query `onCacheEntryAdded` streaming updates that patch the cached vessels from the socket; keep a slow fallback poll.

- [ ] **Simulation clock** — **M**
  - Add pause/resume and 1× / 10× / 100× speed, controlled by admins from Settings and broadcast over the WebSocket.
  - Batch the per-vessel database writes in `tick()` (currently several queries per vessel) so 100× speed and bigger fleets stay smooth.

- [ ] **Position history and voyage replay** — **M**
  - A `vessel_positions` table (vessel_id, ts, location, speed, heading) written each tick, with a retention policy.
  - A replay scrubber on the Live Map: play back any vessel, or the whole fleet, over the last 24 h.

- [ ] **Observability** — **M**
  - Structured logs with `log/slog`, replacing the emoji `log.Printf` lines.
  - Prometheus `/metrics` (request latency, tick duration, WebSocket clients, pgRouting time).
  - `/health` that actually checks the database and reports simulator status.

- [ ] **End-to-end tests** — **M**
  - Playwright covering login → book → dispatch → map → client portal.
  - Bonus: the same run records `docs/showcase.gif` automatically in CI.

- [ ] **Generated API spec** — **S**
  - OpenAPI spec plus a Swagger UI at `/api/docs`; `docs/API.md` becomes generated rather than hand-written.

- [ ] **Public live demo** — **M**
  - Hosted deployment with a read-only guest account and a nightly reset (the existing simulation reset plus a reseed).
  - For a portfolio project, this is the single biggest upgrade.

---

## Phase 2 — Make the world real (flagship)

These items together tell one "voyage economics" story.

- [ ] **Real global sea-lane network** — **L**
  - Replace the 35-line hand-drawn `db/seeds/network_seed.sql` (~15 nodes) with an open global maritime routing network.
  - Mark chokepoints as named edges: Suez, Panama, Malacca, Gibraltar, Hormuz, Bab-el-Mandeb, Dover.
  - Seed more real ports (the top 50 container ports by volume).
  - Done when: Shanghai → Rotterdam routes via Malacca and Suez with a realistic distance (about 10,500 nm).

- [ ] **Chokepoint avoidance** — **M**
  - An admin switch: "Avoid Red Sea / Suez", "Panama draft restrictions". It raises those edges' costs in pgRouting.
  - Affected voyages reroute live (for example around the Cape of Good Hope), and ETA, fuel cost, carbon cost and CII update immediately.
  - Shows up on the map as a shaded closed zone, with an alert to affected shipments' clients.

- [ ] **Weather-aware routing** — **M**
  - Use the existing Open-Meteo marine data (`useMarineWeather.ts`) on the backend to add wave-height costs to edges.
  - In the simulator, effective speed drops in heavy seas.

- [ ] **Slow-steaming optimizer** — **M**
  - Fuel burn rises roughly with the cube of speed. Given an arrival window, pick the cheapest speed.
  - UI: a fuel-cost-vs-arrival-time curve on the booking form, plus a "save X t fuel / Y € by arriving 2 days later" suggestion.

- [ ] **EU ETS carbon cost and Emission Control Areas** — **M**
  - EU ETS has covered shipping since 2024. Add CO₂ cost (fuel × emission factor × EUA price) to Financials as its own line item.
  - ECA polygons (North Sea, Baltic, North American coasts): vessels switch to more expensive low-sulphur fuel inside them.
  - A carbon surcharge appears in the rate card next to BAF/CAF.

- [ ] **Real port congestion from AIS** — **M**
  - `GetPortStats` only counts simulated DOCKED vessels within 10 km.
  - Fix: count real vessels from the AIS Ship Tracker near each port (anchored and moored separately) and feed that into berth-planning warnings.

---

## Phase 3 — Intelligence

- [ ] **Dark-fleet / AIS anomaly detection** — **L**
  - Using real AIS data: AIS gaps (ships going dark), impossible position jumps (spoofing), loitering at sea (possible ship-to-ship transfers).
  - An "Anomalies" panel on the map with explanations for each flag.

- [ ] **AI ops assistant** — **L**
  - A chat panel that answers questions like "Which vessels are due for dry-dock in 60 days and mid-voyage?"
  - Claude calls the existing endpoints as tools: read-only, limited to the user's role, and every tool call written to the audit log.

- [ ] **Better maintenance modelling** — **M**
  - Replace the flat 0.1%/tick wear with failure curves per component type, influenced by sea state and running hours.
  - Show "remaining useful life" with a confidence band on the Maintenance page.

- [ ] **ETA learned from history** — **M**
  - Once position history exists (Phase 1), compare the naive ETA with what actually happened, and show a corrected ETA and its error.

---

## Phase 4 — Commercial depth

- [ ] **Quote → book flow** — **L**
  - The client portal requests a quote; the server calculates the route, distance, rate card, BAF/CAF and carbon surcharge (Phase 2), plus a validity window.
  - The client accepts the quote and a booking is created from it. Admins see a quote → booking conversion rate.

- [ ] **Capacity and stowage** — **L**
  - Enforce `capacity_teu` / `capacity_barrels`; show utilisation % on Fleet Manager and warn on overbooking.
  - A bay-plan grid view per vessel.
  - IMDG segregation rules (e.g. class 1 explosives away from class 3 flammable liquids), checked at booking time.

- [ ] **Invoicing and port charges** — **M**
  - Invoice PDF generated on delivery (reusing the Maroto setup from `pdf_service.go`), with paid/unpaid status.
  - Demurrage/detention charges when containers sit at port past their free days.

- [ ] **Company accounts** — **M**
  - An `organizations` table; several users per client company, with roles inside it (viewer / booker).
  - Shipments scoped by organization rather than a single user.

- [ ] **Client webhooks and DCSA alignment** — **M**
  - Clients register a webhook URL and receive status changes, signed with an HMAC signature, with retries.
  - Align `shipment_events` with the DCSA Track & Trace event model (equipment / transport / shipment events) for real interoperability.
  - Email notifications for key milestones.

---

## Phase 5 — Security, next level

Builds on the Phase 0 fixes.

- [ ] **Session hardening** — **M**
  - Store the token in an httpOnly, SameSite cookie instead of `localStorage` (`authSlice.ts`).
  - Short-lived access tokens with refresh-token rotation, and a `sessions` table for server-side revocation.
  - "Log out all devices" in Settings.

- [ ] **Stronger authentication** — **M**
  - 2FA recovery codes.
  - Passkeys (WebAuthn) for admin accounts.
  - Account lockout with backoff, and new-IP login alerts.
  - Password change and reset flows (currently there are none).

- [ ] **Tamper-evident audit log** — **S**
  - Each `audit_log` row stores `prev_hash` and `hash = sha256(prev_hash || row)`.
  - A "Verify integrity" button on the Activity Log page finds any edited or deleted entry.

- [ ] **Finer-grained roles** — **M**
  - Roles: ADMIN, OPERATOR, FINANCE, CREW_MANAGER, VIEWER, CLIENT, backed by a permissions table instead of string-compared roles in `middleware.RequireRole`.

- [ ] **Postgres row-level security** — **M**
  - RLS policies on `shipments` and `shipment_events` keyed by the current user/org, as a second layer under the handler checks.

- [ ] **Security headers and CI scanning** — **S**
  - `frontend/nginx.conf`: CSP (allowing Mapbox), HSTS, X-Frame-Options, Referrer-Policy.
  - CI: `govulncheck`, `npm audit`, gitleaks, CodeQL, and Trivy on the Docker images.

---

## Phase 6 — UX polish

- [ ] **Command palette** (Ctrl+K) to jump to any vessel, shipment, port or page — **S**
- [ ] **Mobile-friendly client portal as a PWA**, with push notifications for shipment milestones — **M**
- [ ] **Embeddable tracking widget** that customers can drop into their own site — **S**
- [ ] **Light theme and i18n** (English and one more language to start) — **M**
- [ ] **Accessibility audit**: keyboard paths across the dashboard, screen-reader labels on charts and the map — **M**

---

## Suggested order

1. **Phase 0**: small, and the defects undermine everything built on top.
2. **Phase 1**: push updates, the simulation clock and position history make the later features demoable.
3. **Phase 2**: the flagship; the sea-lane network, chokepoint avoidance, slow steaming and EU ETS together form one coherent story.
4. Phases 3–6, in whatever order is most interesting.
