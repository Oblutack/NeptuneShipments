# NeptuneOS

> Enterprise Maritime Logistics & Fleet Management Platform

**NeptuneOS** is a full-stack ERP system for autonomous shipping operations at global scale. Built on real-time geospatial intelligence, graph-based ocean routing, and predictive maintenance analytics, it provides unified command and control for modern maritime fleets.

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.24-00ADD8?logo=go&logoColor=white" alt="Go 1.24" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PostGIS-3.5-5CAE58" alt="PostGIS" />
  <img src="https://img.shields.io/badge/pgRouting-3.8-336791" alt="pgRouting" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

---

## Demo

<p align="center">
  <img src="docs/showcase.gif" alt="NeptuneOS walkthrough: login, live map, a real auto-routed voyage, maintenance alerts, live rate-card financials, and the client portal" width="900" />
</p>

<p align="center"><em>Live walkthrough — logging in, the fleet map, booking a shipment and watching pgRouting auto-calculate an ocean-only route and dispatch the vessel in real time, a dry-dock survey alert, live oil-price/FX-rate financials, and the scoped client portal. Everything shown is the running app against real data, not mockups.</em></p>

---

## Table of Contents

- [Demo](#demo)
- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Key Modules](#key-modules)
- [Data Model](#data-model)
- [Installation & Setup](#installation--setup)
- [API Reference](#api-reference)
- [Operational Workflows](#operational-workflows)
- [Testing](#testing)
- [Performance](#performance)
- [Security](#security--compliance)
- [License](#license)

---

## Overview

NeptuneOS integrates critical operational domains — fleet tracking, route optimization, cargo management, crew administration, port scheduling, and financial reporting — into a single platform. Leveraging PostGIS spatial databases and pgRouting's Dijkstra-based network analysis, the system enables intelligent decision-making for complex maritime logistics.

### Core Value Proposition

- **Autonomous Route Planning** — Graph-based pathfinding calculates optimal ocean-only routes over a seeded ocean network (14 ports, ~15-node graph in the default seed data — small by design for a demo, the pgRouting/PostGIS setup scales to a much larger network without code changes)
- **Live Fleet Intelligence** — Vessel positions refresh via 2-5s HTTP polling (RTK Query) on a Mapbox GL 3D globe; a WebSocket (`/ws/fleet`, token-authenticated) pushes a snapshot on connect plus live CRITICAL/INFO alerts
- **Predictive Maintenance** — Component-level health monitoring with entropy-based degradation modeling, plus real IMO CII emissions ratings and dry-dock survey scheduling
- **Cargo Lifecycle Management** — Full CRUD for shipments with manifest items (including real IMDG dangerous-goods classification), BOL generation, voyage track-and-trace, and automatic status transitions
- **Port Berth Scheduling** — Drag-and-drop terminal allocation with conflict detection
- **Financial Analytics** — Real-time P&L reporting priced off live oil price/FX data, not flat constants
- **Client Portal** — A scoped self-service view for `CLIENT`-role accounts, separate from the admin fleet-ops dashboard
- **Security Hardening** — JWT auth, optional TOTP 2FA, rate limiting, and an audit log on every administrative action

---

## System Architecture

High-level view of how the pieces fit together — the React frontend talks
to the Go backend over REST (polling) and a JWT-authenticated WebSocket for
alerts; the backend's simulation engine is the real driver of fleet state,
reading/writing Postgres directly on every tick; the AIS Ship Tracker is a
separate, optional service that overlays real ship positions onto the same
map without sharing a database.

```mermaid
flowchart TB
    subgraph Client["Frontend — React 19 + TypeScript + Vite"]
        Pages["Dashboard Pages\n(Fleet, Cargo, Crew, Finance, ...)"]
        Portal["Client Portal\n(/portal, CLIENT role)"]
        RTK["RTK Query\napiSlice.ts"]
        GlobalMap["GlobalMap\nMapbox GL globe"]
        WSHook["useWebSocket\nfleet alerts"]
        AISHook["useAISTraffic\noptional live overlay"]
    end

    subgraph Server["Backend — Go + Fiber (wired by hand in main.go)"]
        Handlers["HTTP Handlers\nvessels / ports / shipments / crew / ..."]
        AuthMW["JWT Auth + RequireRole\n+ rate limiting + audit log"]
        Repos["Repository Layer (pgx)\n+ oil price / FX rate clients"]
        SimEngine["Simulation Engine\n5s tick: movement, fuel burn,\ncomponent wear, DISTRESS, berth activation"]
        Hub["WebSocket Hub\n/ws/fleet"]
    end

    subgraph Postgres["PostgreSQL + PostGIS + pgRouting"]
        Core[("vessels, ports, routes,\nshipments, crew, berths, users")]
        OceanGraph[("ocean_network graph\n(Dijkstra routing)")]
    end

    subgraph Tracker["AIS Ship Tracker — separate repo, optional (:8090)"]
        AISFeed["aisstream.io feed"]
        AISStore["In-memory vessel store"]
        AISWs["/ws + /api/ports"]
    end

    Pages --> RTK
    Portal --> RTK
    RTK -- "HTTP, 2-5s polling" --> Handlers
    WSHook -- "WebSocket, JWT in query" --> Hub
    GlobalMap -.-> AISHook
    AISHook -. "WebSocket, optional" .-> AISWs

    Handlers --> AuthMW
    Handlers --> Repos
    Handlers -- "route calc" --> OceanGraph
    Repos --> Core
    SimEngine --> Repos
    SimEngine -. "raw SQL (berth activation)" .-> Core
    SimEngine --> Hub
    Hub -- "FLEET_UPDATE / ALERT" --> WSHook

    AISFeed --> AISStore
    AISStore --> AISWs
```

### Technology Stack

| Layer                 | Technology                  | Purpose                                           |
| --------------------- | ---------------------------- | -------------------------------------------------- |
| **API Server**        | Go 1.24 + Fiber v2           | High-throughput HTTP/WebSocket service            |
| **Database**          | PostgreSQL 16 + PostGIS 3.5  | Geospatial data persistence                       |
| **Routing Engine**    | pgRouting 3.8                | Dijkstra graph-based ocean pathfinding            |
| **Real-Time Layer**   | WebSockets (Fiber)           | Live fleet telemetry & alert streaming            |
| **Simulation Engine** | Go (background goroutine)    | Vessel movement, fuel burn, component degradation |
| **PDF Generation**    | Maroto                       | Bill of Lading document generation                |
| **Frontend**          | React 19 + TypeScript 5.9    | Type-safe UI with Vite 7                          |
| **State Management**  | Redux Toolkit + RTK Query    | Centralized state with cache invalidation         |
| **Visualization**     | Mapbox GL JS + Recharts      | 3D geospatial rendering & analytics charts        |
| **Drag & Drop**       | dnd-kit                      | Berth scheduler allocation                        |
| **Styling**           | Tailwind CSS v4              | Utility-first design system with glassmorphism    |
| **Testing**           | Go `testing` + Vitest/RTL    | Backend + frontend test suites, both run in CI     |

### Service Ports

| Service      | Port   | URL                            |
| ------------ | ------ | ------------------------------- |
| Backend API  | `8080` | `http://localhost:8080`        |
| Frontend Dev | `5173` | `http://localhost:5173`        |
| PostgreSQL   | `5455` | `localhost:5455`               |
| pgAdmin      | `5050` | `http://localhost:5050`        |
| WebSocket    | `8080` | `ws://localhost:8080/ws/fleet` |

### Project Structure

```
NeptuneOS/
├── backend/
│   ├── cmd/
│   │   ├── api/                  # HTTP server entrypoint
│   │   └── seeder/               # Database initialization & CSV import tool
│   ├── internal/
│   │   ├── handlers/             # HTTP request handlers (14 modules)
│   │   ├── repository/           # Data access layer - raw SQL with pgx (17 repos, incl. real-data clients for oil price/FX rate)
│   │   ├── services/             # Business logic: CSV importer, PDF generator
│   │   ├── models/               # Domain entities
│   │   ├── database/             # Connection pooling (pgx pool)
│   │   ├── simulator/            # Physics engine - movement, fuel, degradation
│   │   ├── navigation/           # Geospatial math (Haversine, bearings)
│   │   ├── middleware/           # JWT auth, role gating, audit logging
│   │   ├── testutil/             # Shared test helpers (real-DB connection, fixture uniqueness)
│   │   └── websocket/            # Hub + client management for real-time layer
│   ├── db/
│   │   ├── Dockerfile            # PostgreSQL + PostGIS 3.5 + pgRouting 3.8 (pgrouting/pgrouting official image)
│   │   ├── migrations/           # Versioned schema migrations (golang-migrate; numbering jumps 11→21, see CLAUDE.md)
│   │   └── seeds/                # Ocean network graph seed data (~15 nodes in the default seed)
│   └── go.mod
│
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── api/              # RTK Query API slice (centralized mutations/queries)
│   │   │   ├── auth/             # JWT auth state + RequireAuth route guard
│   │   │   ├── map/              # Mapbox GL globe, command deck, port inspector, live weather/AIS overlays
│   │   │   ├── fleet/            # Cargo manifest viewer (incl. IMDG badges), tank monitor
│   │   │   ├── shipments/        # Shipment CRUD: form, list with edit/delete modals
│   │   │   ├── crew/             # Crew roster, vessel assignment, cert-expiry alerts
│   │   │   ├── port/             # Berth scheduler (drag-and-drop with dnd-kit)
│   │   │   ├── analytics/        # Alert feed, real revenue trend chart
│   │   │   ├── notifications/    # WebSocket hook + notification state
│   │   │   └── preferences/      # User preferences state
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx      # Public marketing page
│   │   │   ├── LoginPage.tsx        # Authentication
│   │   │   ├── TrackingPage.tsx     # Public shipment tracking with map + voyage timeline
│   │   │   ├── ClientPortalPage.tsx # Scoped "my shipments" view for CLIENT-role accounts
│   │   │   └── dashboard/           # Admin dashboard views (stats, fleet, cargo, crew, maintenance, finance, data, activity, settings)
│   │   ├── lib/                   # Pure domain logic, unit-tested: CII rating, IMDG labels, geo math, date helpers
│   │   ├── test/                  # Vitest setup
│   │   ├── layouts/              # DashboardLayout + Sidebar
│   │   └── components/ui/        # DataTable, ToastContainer, ConfirmDialog, StatusBadge
│   ├── package.json
│   └── vite.config.ts
│
├── data/                         # CSV seed files (ports, vessels, routes, crew, etc.)
├── docker-compose.yml            # Full stack: Postgres + pgAdmin + API + web (see Installation)
└── README.md
```

---

## Key Modules

### 1. Global Command Center (Live Map)

Real-time situational awareness across the entire fleet on an interactive Mapbox GL 3D globe.

- **Live Fleet Map** — Vessel positions, headings, and speed vectors with 5-second refresh, keyboard-accessible ship markers
- **Route Network Overlay** — Visualize shipping lanes and active voyage paths
- **Live Sea State** — Real wave height/swell/period per port from Open-Meteo Marine, optional overlay
- **Live AIS Traffic** — Real, currently-tracked vessels near a port, via the companion AIS Ship Tracker service
- **Port Statistics** — Throughput analytics and terminal occupancy metrics
- **Ship Info Panel** — Click any vessel (or focus + Enter) for detailed status, fuel levels, and cargo
- **Command Deck** — Side panel showing active voyages and port congestion monitors
- **Fleet Paths Toggle** — Show/hide all active route geometries on the map
- **Vessel Filters** — Filter by type (OIL tankers, BOX containers) or hide docked vessels

### 2. Intelligent Routing Engine

Autonomous pathfinding leveraging pgRouting's Dijkstra algorithm on a pre-computed ocean network graph.

- **Ocean-Only Routes** — All routes follow water, never crossing land
- **Automatic Route Assignment** — An ADMIN-booked shipment with a vessel attached auto-calculates the optimal route, assigns it, and starts the voyage; a CLIENT's own booking always starts unassigned (see Client Portal below)
- **Multi-Segment Route Merging** — `ST_LineMerge` converts pgRouting's MultiLineString output into clean LineString geometries
- **Spherical Distance** — Haversine formula for accurate great-circle distance calculations

### 3. Cargo & Shipment Management

Full lifecycle management from manifest creation through delivery.

- **Shipment CRUD** — Create, read, update, and delete shipments with confirmation modals
- **Manifest Items** — JSONB-stored line items with SKU, description, quantity, unit value, and an optional real IMDG dangerous-goods class
- **Bill of Lading (BOL)** — PDF generation and download via the Maroto library
- **Smart Status Transitions** — Automatic PENDING → IN_TRANSIT when vessel departs, IN_TRANSIT → DELIVERED on arrival
- **Voyage Track-and-Trace** — A real event timeline (BOOKED, DEPARTED, DELIVERED, ...) per shipment, driven by actual state transitions
- **Public Tracking** — Anyone can track a shipment by tracking number (no auth required)
- **Vessel Assignment** — ADMIN can assign shipments to specific vessels, with automatic route calculation

### 4. Liquid Logistics (Tank Monitoring)

Specialized tanker operations dashboard for monitoring liquid cargo.

- **Tank-Level Monitoring** — Real-time ullage tracking across multiple compartments
- **Thermal Management** — Temperature readings per tank for sensitive cargoes
- **Flow State Tracking** — Fill/drain status indicators for active pumping operations

### 5. Engineering & Predictive Maintenance

Component-level health monitoring powered by the simulation engine's entropy-based degradation.

- **Component Types** — Propulsion, electrical, navigation, and hull systems tracked individually
- **Health Degradation** — 0.1% entropy-based degradation per simulation tick
- **Status Thresholds** — Automatic OPERATIONAL → WARNING → CRITICAL state transitions
- **One-Click Maintenance** — Reset component health to 100% with logged timestamp
- **Distress Detection** — Vessel enters DISTRESS state on fuel depletion or critical component failure (the two causes are tracked distinctly - running out of fuel zeroes `fuel_level`, a mechanical failure does not)
- **Recovery Workflow** — Vessels auto-recover from DISTRESS after repairs and refueling
- **CII Emissions Rating** — A–E band per vessel, computed from the IMO's real reference-line formula
- **Dry-Dock Survey Alert** — Flags a vessel whose next survey is due soon or overdue

### 6. Crew Management

Personnel administration with vessel assignments, role tracking, and certification monitoring.

- **Crew Roster** — Full listing with name, role, license, nationality, and status
- **Vessel Assignment** — Assign crew members to specific vessels
- **Role Hierarchy** — Captain, Chief Engineer, First Officer, Deckhand, Cook
- **Status Tracking** — Active, On Leave, and Retired states
- **Certificate Expiry Tracking** — STCW-style certificate expiry per crew member, with a quiet "expiring soon" badge within 60 days
- **CSV Bulk Import** — Onboard entire crew lists from CSV files

### 7. Port & Berth Scheduling

Terminal management with drag-and-drop berth allocation.

- **Terminal Directory** — Browse terminals by port with type classification (Container, Liquid, Bulk)
- **Berth Allocation** — Schedule vessel arrivals with start/end times and notes
- **Drag-and-Drop** — Visual scheduler powered by dnd-kit for intuitive allocation
- **Conflict Detection** — Prevent overlapping berth bookings, with the real conflict reason surfaced in the UI on failure
- **Auto-Activation** — Berth status automatically updates when vessels arrive at port

### 8. Financial Analytics

Real-time P&L dashboard with operational cost modeling, priced off real live market data rather than flat constants.

- **Rate-Card Freight Pricing** — Base rate ($/kg) plus a BAF (Bunker Adjustment Factor) and CAF (Currency Adjustment Factor), the same surcharge structure real carriers publish — both driven by live data, not invented
- **Live Fuel Cost** — Bunker fuel priced off a real WTI crude oil quote (Yahoo Finance, via barrels-per-ton conversion), with an offline fallback that's clearly labeled in the UI when the live feed is unreachable
- **Live FX Rate** — USD/EUR rate from a real feed (Frankfurter), same live/fallback labeling
- **Gross Profit** — Automated P&L: Revenue − Operating Costs
- **KPI Dashboard** — Active jobs, completed shipments, fuel consumed, average revenue per job
- **Real Revenue Trend** — Per-day revenue computed from actual shipment bookings, not mock data; operating cost on the chart is the real fleet-wide fuel cost allocated pro-rata by each day's revenue share, labeled as an allocation rather than claimed as independently real

### 9. Data Management

Centralized CSV import system for initial data seeding and bulk operations.

- **Multi-Entity Import** — Ports, vessels, routes, crew, shipments, and users
- **Validation** — Header parsing with field-level validation
- **Bulk Operations** — Efficient batch processing via repository layer

### 10. Client Portal

A scoped, customer-facing view alongside the admin dashboard — the same architecture real logistics SaaS products (project44, FourKites) are built around.

- **Self-Service Booking** — A `CLIENT`-role account can book its own shipments; bookings always start unassigned (`PENDING`, no vessel) rather than letting a client dispatch a specific vessel directly — that stays an operational/admin action
- **Scoped Visibility** — A client only ever sees shipments tied to their own account (`customer_user_id`, set from the verified JWT, never trusted from request input), enforced server-side in the query itself, not just hidden in the UI
- **Separate Landing** — Logging in as a `CLIENT` routes to `/portal`, a simplified "my shipments" view, instead of the full fleet-ops dashboard

### 11. Security Hardening

- **Two-Factor Authentication** — TOTP-based 2FA (any standard authenticator app), optional per account, set up from Settings
- **Rate Limiting** — A global request limiter plus a tighter limiter specifically on `/api/auth/login`, to blunt brute-force attempts
- **Audit Log** — Every administrative mutation (vessel/port/crew/shipment changes, CSV imports, maintenance, berth allocation, simulation reset) is logged with actor, action, and entity, viewable on an admin-only Activity Log page
- **Fail-Fast JWT Secret** — The server refuses to start in production without a real `JWT_SECRET`; only local dev falls back to an insecure default, with a loud warning
- **Server-Side Access Control** — Role checks live in the handlers, not just the UI (e.g. a CLIENT can't read another vessel's full manifest or dispatch a vessel by crafting a request directly)

### 12. Real-Time Simulation Engine

Background physics engine that powers the entire live fleet experience.

- **Vessel Movement** — Route-following with progress-based interpolation along LineString geometries
- **Fuel Consumption** — Burn rate scales with vessel speed: `0.5 × (speed / 20.0)` tons per tick
- **Component Degradation** — Probabilistic entropy applied to all ship components each tick
- **Distress Detection** — Automatic DISTRESS state on fuel depletion or critical component failure
- **Arrival Handling** — Auto-dock vessels at destination, update shipment status to DELIVERED
- **WebSocket Alerts** — Broadcasts CRITICAL and INFO notifications to all connected clients
- **Deduplication** — Alert tracking prevents duplicate notifications per vessel
- **Admin Reset** — `/api/simulation/reset` clears active-voyage state and returns every vessel to idle, in one transaction

---

## Data Model

### Entity Relationship Overview

```
Ports ──────────── Terminals ──────── Berths
  │                                     │
  │ origin/destination                  │ allocation
  │                                     │
Shipments ─────── Vessels ────────── BerthAllocations
  │     │           │
  │     │ booked by │ assignment
  │     ▼           │
  │   Users ◄────────┘ (role: ADMIN or CLIENT)
  │ manifest         │
  │                 Components
ManifestItems         │
(JSONB)              Crew
```

### Core Entities

| Entity              | Key Fields                                                                                                                                                                                           | Notes                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Vessel**          | `id`, `name`, `imo_number`, `type`, `status`, `location` (POINT), `heading`, `speed_knots`, `fuel_level/capacity`, `current_route_id`, `route_progress`, `total_fuel_consumed_tons`, `total_distance_nm` (lifetime, for CII), `next_survey_due` | 5 statuses: AT_SEA, DOCKED, ANCHORED, MAINTENANCE, DISTRESS                 |
| **Port**            | `id`, `un_locode`, `name`, `country`, `location` (POINT), `type`                                                                                                                                     | 14 ports in the default seed data                                           |
| **Route**           | `id`, `name`, `path` (LINESTRING), `origin_port_id`, `destination_port_id`                                                                                                                           | Computed via pgRouting Dijkstra                                             |
| **Shipment**        | `id`, `tracking_number`, `customer_name`, `origin/destination_port_id`, `vessel_id`, `customer_user_id`, `status`, `weight_kg`, `manifest_items` (JSONB), `eta`                                      | Statuses: PENDING, IN_TRANSIT, DELIVERED; `customer_user_id` links to the CLIENT account that booked it |
| **ManifestItem**    | `sku`, `description`, `quantity`, `unit_value`, `total_value`, `imdg_class`                                                                                                                          | Stored as JSONB array in Shipment; `imdg_class` is one of the IMDG Code's 9 real UN hazard classes, if any |
| **ShipmentEvent**   | `id`, `shipment_id`, `event_type`, `description`, `created_at`                                                                                                                                       | Voyage track-and-trace history: BOOKED, DEPARTED, DELIVERED, etc.          |
| **Terminal**        | `id`, `port_id`, `name`, `type`                                                                                                                                                                      | Types: CONTAINER, LIQUID, BULK, GENERAL                                     |
| **Berth**           | `id`, `terminal_id`, `name`, `length_meters`, `is_occupied`, `current_vessel_id`                                                                                                                     | Nested under Terminal                                                        |
| **BerthAllocation** | `id`, `vessel_id`, `berth_id`, `start_time`, `end_time`, `status`, `notes`                                                                                                                            | Statuses: SCHEDULED, ACTIVE, COMPLETED, CANCELLED                           |
| **Component**       | `id`, `vessel_id`, `name`, `type`, `health_percentage`, `status`, `total_operating_hours`, `last_maintenance`                                                                                        | Types: PROPULSION, ELECTRICAL, NAVIGATION, HULL                             |
| **Crew**            | `id`, `name`, `role`, `license_number`, `nationality`, `vessel_id`, `status`, `cert_expiry_date`                                                                                                      | Roles: CAPTAIN, CHIEF_ENGINEER, FIRST_OFFICER, DECKHAND, COOK               |
| **User**            | `id`, `email`, `password_hash`, `full_name`, `company_name`, `role`, `totp_secret`, `totp_enabled`                                                                                                    | Roles: ADMIN, CLIENT. Auth entity with bcrypt hashing + optional TOTP 2FA   |
| **AuditLogEntry**   | `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `metadata` (JSONB), `created_at`                                                                                                              | Written on every administrative mutation                                    |
| **FinancialStats**  | `total_revenue`, `total_fuel_cost`, `gross_profit`, `active_job_count`, `avg_revenue_per_job`, `base_freight_rate`, `baf_percent`, `caf_percent`, `effective_rate`, `fuel_price_per_ton`, `fx_rate_usd_eur` | Computed via SQL aggregation + live oil price/FX rate                        |

---

## Installation & Setup

### Prerequisites

- **Docker Desktop** 24.0+ (for PostgreSQL + PostGIS + pgRouting)
- **Go** 1.24+
- **Node.js** 20+ with npm
- **golang-migrate** CLI ([installation guide](https://github.com/golang-migrate/migrate))
- **Mapbox** account ([get a free token](https://account.mapbox.com/))

### Step 1: Clone & Configure

```bash
git clone https://github.com/Oblutack/NeptuneShipments.git
cd NeptuneShipments
```

Create `backend/.env`:

```env
DB_URL=postgres://postgres:password123@localhost:5455/neptune_shipments?sslmode=disable
PORT=8080
JWT_SECRET=neptune_production_secret_key
ENVIRONMENT=development
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8080/api
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

### Step 2: Start Database

`docker-compose.yml` actually defines four services (`db`, `pgadmin`, `api`, `web`) — for local development with hot-reload, start only the database for now and run the backend/frontend directly (Steps 5-6):

```bash
docker-compose up -d --build db pgadmin
```

This starts:

- **PostgreSQL 16** with PostGIS 3.5 + pgRouting 3.8 on port `5455`
- **pgAdmin** on port `5050` (login: `admin@neptune.com` / `password123`)

(See [One-Command Full Stack](#one-command-full-stack-alternative) at the end of this section if you'd rather run the whole app containerized instead of for local dev.)

### Step 3: Run Migrations

```bash
cd backend
migrate -path db/migrations \
  -database "postgres://postgres:password123@localhost:5455/neptune_shipments?sslmode=disable" \
  up
```

### Step 4: Seed Data

```bash
cd backend
go run cmd/seeder/main.go
```

This imports the default seed data in `data/*.csv`: 14 ports, 6 vessels,
7 crew members, 1 seed route, and the ocean routing graph (~15 nodes).
Additional routes are created automatically at runtime whenever a
shipment is assigned to a vessel. The seeder logs its own progress as it
runs (`✅ Imported N ports`, etc.) - swap in your own CSVs under `data/`
to seed a larger fleet/port set without any code changes.

### Step 5: Start Services

**Backend:**

```bash
cd backend
go run cmd/api/main.go
```

```
Server starting on port 8080
Access via: http://localhost:8080
✅ WebSocket Hub Running
Simulation Engine Started (Tick: 5s)
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

```
VITE v7.x  ready in 500ms
Local: http://localhost:5173/
```

### Step 6: Login

Navigate to `http://localhost:5173/login`.

**Admin** (full fleet-ops dashboard):

```
Email:    admin@neptune.com
Password: admin123
```

**Client** (scoped "my shipments" portal at `/portal`, seeded by migration `000029` with two demo bookings already attached):

```
Email:    client@neptune.com
Password: client123
```

### One-Command Full Stack (alternative)

Once migrations and seed data are in place (Steps 3-4), you can run the
entire app containerized instead of `go run`/`npm run dev`:

```bash
docker-compose up -d --build
```

This brings up all four services — `db`, `pgadmin`, `api` (port `8080`),
and `web` (port `5173`, served via nginx). Pass `VITE_MAPBOX_TOKEN`,
`VITE_AIS_TRACKER_URL`, and/or `VITE_API_URL` as environment variables
before running this if you need non-default values - they're baked into
the `web` image at build time (see `docker-compose.yml`). The `api`
service also requires `JWT_SECRET` to be set in your shell environment,
or the container will refuse to start.

---

## API Reference

### Authentication

Protected endpoints require `Authorization: Bearer <token>`. "Admin" in
the Auth column below means `requireAdmin` specifically (a CLIENT-role
token gets a 403); "Auth" alone means any authenticated user.

| Method | Endpoint                 | Auth  | Description                                  |
| ------ | ------------------------- | ----- | --------------------------------------------- |
| `POST` | `/api/auth/login`        | No    | Authenticate and receive JWT (rate-limited)    |
| `POST` | `/api/auth/totp/setup`   | Auth  | Begin TOTP 2FA setup, returns a QR code        |
| `POST` | `/api/auth/totp/verify`  | Auth  | Confirm a TOTP code and enable 2FA             |
| `POST` | `/api/auth/totp/disable` | Auth  | Disable 2FA (requires a valid current code)    |

### Fleet Operations

| Method   | Endpoint                            | Auth  | Description                                                         |
| -------- | ------------------------------------- | ----- | ----------------------------------------------------------------------- |
| `GET`    | `/api/vessels`                       | Auth  | List all vessels                                                     |
| `GET`    | `/api/vessels/:id`                   | No    | Get vessel details                                                   |
| `GET`    | `/api/vessels/template`              | Auth  | Download a CSV import template                                       |
| `POST`   | `/api/vessels`                       | Admin | Create a new vessel                                                  |
| `PUT`    | `/api/vessels/:id`                   | Admin | Update a vessel                                                      |
| `DELETE` | `/api/vessels/:id`                   | Admin | Delete a vessel (blocked if it has active shipments)                 |
| `POST`   | `/api/vessels/import`                | Admin | Bulk-import vessels from CSV                                         |
| `POST`   | `/api/vessels/:id/refuel`            | Admin | Refuel vessel to full capacity                                       |
| `GET`    | `/api/vessels/:vesselId/tanks`       | Auth  | Get vessel tank levels                                                |
| `GET`    | `/api/vessels/:vesselId/components`  | Auth  | Get vessel components                                                 |
| `GET`    | `/api/vessels/:id/crew`              | Auth  | Get crew assigned to vessel                                           |
| `GET`    | `/api/vessels/:vesselId/shipments`   | Admin | Get vessel cargo manifest (fleet-ops view, not a client's own list)  |

### Routing

| Method | Endpoint                | Auth | Description                                              |
| ------ | ------------------------ | ---- | -------------------------------------------------------- |
| `GET`  | `/api/routes/network`   | No   | Get full ocean network mesh (GeoJSON)                    |
| `POST` | `/api/routes/calculate` | No   | Calculate route between two coordinates                  |
| `GET`  | `/api/routes/active`    | No   | Get all active voyage routes (GeoJSON FeatureCollection) |
| `GET`  | `/api/routes/:id`       | No   | Get specific route by ID                                 |

### Cargo & Shipments

| Method   | Endpoint                               | Auth  | Description                                                                                                                                                 |
| -------- | ----------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/shipments/:trackingNumber`         | No    | Public shipment tracking                                                                                                                                  |
| `GET`    | `/api/shipments/:trackingNumber/events`  | No    | Public voyage track-and-trace timeline (BOOKED, DEPARTED, DELIVERED, ...)                                                                                 |
| `GET`    | `/api/shipments`                         | Auth  | List shipments — every shipment for ADMIN, only the caller's own for CLIENT                                                                               |
| `POST`   | `/api/shipments`                         | Auth  | Create a shipment. ADMIN can assign a vessel directly (auto-routes + dispatches it); a CLIENT's booking always starts unassigned, `customer_user_id` from the JWT, not the request body |
| `PUT`    | `/api/shipments/:id`                     | Admin | Update shipment                                                                                                                                            |
| `DELETE` | `/api/shipments/:id`                     | Admin | Delete shipment                                                                                                                                            |
| `GET`    | `/api/shipments/:trackingNumber/bol`     | Auth  | Download Bill of Lading (PDF)                                                                                                                              |

### Ports & Scheduling

| Method   | Endpoint                       | Auth  | Description                                  |
| -------- | -------------------------------- | ----- | ----------------------------------------------- |
| `GET`    | `/api/ports`                    | Auth  | List all ports                               |
| `GET`    | `/api/ports/stats`              | Auth  | Port throughput statistics                   |
| `POST`   | `/api/ports`                    | Admin | Create a port                                |
| `PUT`    | `/api/ports/:id`                | Admin | Update a port                                |
| `DELETE` | `/api/ports/:id`                | Admin | Delete a port                                |
| `POST`   | `/api/ports/import`             | Admin | Bulk-import ports from CSV                   |
| `GET`    | `/api/ports/template`           | No    | Download a CSV import template               |
| `GET`    | `/api/ports/:portId/terminals`  | Auth  | Get port terminals and berths                |
| `GET`    | `/api/ports/:portId/schedule`   | Auth  | Get port berth schedule                      |
| `POST`   | `/api/allocations`              | Admin | Create a berth allocation (conflict-checked) |
| `GET`    | `/api/allocations/unassigned`   | Auth  | Get vessels without berth assignments        |

### Crew, Finance, Maintenance, Admin

| Method | Endpoint                       | Auth  | Description                                                                                             |
| ------ | --------------------------------- | ----- | -------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/crew`                      | Auth  | List all crew members                                                                                  |
| `PUT`  | `/api/crew/:id/assign`           | Admin | Assign/reassign a crew member to a vessel                                                                |
| `POST` | `/api/components/:id/maintain`   | Admin | Perform maintenance on a component (resets health to 100%)                                               |
| `GET`  | `/api/finance/stats`             | Auth  | Financial KPIs, incl. live rate-card (BAF/CAF) and fuel/FX pricing                                       |
| `GET`  | `/api/finance/revenue-trend`     | Auth  | Real per-day revenue for the last N days (`?days=7` default)                                             |
| `GET`  | `/api/audit`                     | Admin | Audit log of administrative actions                                                                      |
| `POST` | `/api/simulation/reset`          | Admin | Clear active-voyage state (shipments/routes/berth allocations); vessels return to idle, fully fueled     |
| `GET`  | `/health`                        | No    | Server health check                                                                                      |

### WebSocket

```
ws://localhost:8080/ws/fleet
```

Message types:

- `FLEET_UPDATE` — Vessel positions, headings, speeds, fuel levels (every 5s)
- `ALERT` — Critical notifications with level, message, vessel ID, and timestamp

---

## Operational Workflows

### Creating a Shipment (Admin — Automatic Voyage Start)

1. Navigate to **Dashboard → Cargo**
2. Fill in the shipment form: origin port, destination port, vessel, customer, weight, manifest items (optionally flag a line item with an IMDG class)
3. Submit — the backend automatically:
   - Calculates the optimal ocean route via pgRouting
   - Assigns the route to the selected vessel
   - Sets the vessel status to `AT_SEA` with full fuel
   - Transitions the shipment to `IN_TRANSIT`
   - Updates any other PENDING shipments on the same vessel
4. The vessel immediately begins moving along the route on the live map

### Booking as a Client

1. Log in with a `CLIENT`-role account - you land on `/portal`, not the admin dashboard
2. Submit a booking the same way, minus picking a vessel - it's created `PENDING` and awaits an operator
3. The shipment appears only in your own "My Shipments" list, never another customer's
4. Track it the same way anyone can - by tracking number, including the voyage timeline

### Monitoring Fleet Health

1. Navigate to **Dashboard → Maintenance**
2. View component health matrix, CII rating, and dry-dock survey status across all vessels
3. Components below 30% health are highlighted as WARNING/CRITICAL
4. Click **Perform Maintenance** to reset health to 100%
5. If a vessel enters DISTRESS (fuel empty or critical failure), refuel or repair to recover

### Responding to Alerts

1. Real-time toast notification appears (e.g., _"Ever Given has run out of fuel!"_)
2. Vessel automatically enters DISTRESS state and stops moving
3. Navigate to the vessel on the map and initiate refueling
4. Post-refuel, the vessel auto-recovers to ANCHORED status
5. Create a new shipment to resume the voyage

### Scheduling a Berth

1. Navigate to **Dashboard → Scheduler** and select a port
2. View terminal/berth availability in the timeline view
3. Drag unassigned vessels to available berth slots
4. Set arrival time, departure time, and notes
5. When a vessel arrives at the port, the allocation auto-activates; a real conflict (overlapping booking) surfaces the backend's actual error instead of failing silently

### Resetting the Simulation

1. Navigate to **Dashboard → Settings → Danger Zone**
2. **Reset Simulation** clears all shipments, routes, and berth allocations, and returns every vessel to idle, fully fueled - ports, crew, and accounts are untouched
3. Confirm in the dialog; a toast reports success or failure

---

## Testing

Both the backend and frontend have real test suites that run in CI on
every push and pull request, not just locally.

**Backend** (Go `testing`, 25 test functions across `handlers`,
`middleware`, `navigation`, `repository`, and `simulator`):

```bash
cd backend
go test ./...
```

Most of these are integration tests against a real Postgres database
(not mocks) - set `DB_URL` (same var the app itself uses; `backend/.env`
is picked up automatically) to run them locally. Without it, DB-backed
tests skip gracefully rather than fail. CI builds the project's own
Postgres+PostGIS+pgRouting image, runs migrations, and sets `DB_URL`
before `go test` runs, so they always execute there.

**Frontend** (Vitest + React Testing Library, 18 tests):

```bash
cd frontend
npm test          # run once
npm run test:watch # watch mode
```

Covers the pure domain logic in `src/lib/` (CII rating, IMDG labels, geo
math, date helpers) plus component rendering.

---

## Performance

| Metric                | Value                                 |
| ---------------------- | --------------------------------------- |
| Simulation tick rate  | 5 seconds                             |
| Route calculation     | < 100ms (trans-oceanic via pgRouting) |
| API response time     | < 50ms (standard CRUD)                |
| WebSocket latency     | < 100ms                               |
| Frontend initial load | < 2s (Vite code-split)                |
| Map rendering         | 60 FPS (hardware accelerated)         |
| DB connection pool    | 20 max connections (pgx)              |
| Spatial index         | GIST on all GEOGRAPHY columns         |

---

## Security & Compliance

- **Authentication** — JWT-based stateless auth with a configurable secret; the server refuses to start in production without a real `JWT_SECRET` set (local dev falls back to an insecure default, with a loud warning)
- **Two-Factor Authentication** — Optional TOTP 2FA per account (any standard authenticator app), set up from Settings
- **Authorization** — Role-based (`ADMIN`/`CLIENT`) middleware, enforced server-side in the handlers, not just the UI:
  - Destructive/administrative endpoints (vessel and port mutations, CSV import, component maintenance, berth allocation, crew assignment, shipment update/delete, simulation reset, audit log) require `ADMIN`
  - A CLIENT can create and read their own shipments, but can't assign a vessel to a booking (that always starts unassigned) and can't read another vessel's full manifest
  - Public tracking/voyage-timeline endpoints stay genuinely public (no auth) by design
  - `/ws/fleet` requires a valid token too, passed as a query param since a browser WebSocket handshake can't carry a header
- **Rate Limiting** — A global request limiter, plus a tighter one specifically on `/api/auth/login`
- **Audit Log** — Every administrative mutation is recorded with actor, action, and entity, viewable on an admin-only page
- **Password Security** — bcrypt hashing (cost factor 10)
- **Route Protection** — `RequireAuth` guard on all dashboard/portal routes
- **CORS** — Configurable via the `CORS_ORIGINS` env var; defaults to `localhost:5173`/`127.0.0.1:5173` for local dev
- **SQL Injection Prevention** — Parameterized queries throughout (pgx)
- **Environment Config** — All secrets via `.env` files (never committed)

---

## License

MIT License — Copyright (c) 2026 NeptuneOS

---

**NeptuneOS** — Powering the future of autonomous maritime logistics.
