# NeptuneOS

> Enterprise Maritime Logistics & Fleet Management Platform

**NeptuneOS** is a full-stack ERP system for autonomous shipping operations at global scale. Built on real-time geospatial intelligence, graph-based ocean routing, and predictive maintenance analytics, it provides unified command and control for modern maritime fleets.

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.24-00ADD8?logo=go&logoColor=white" alt="Go 1.24" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PostGIS-3.4-5CAE58" alt="PostGIS" />
  <img src="https://img.shields.io/badge/pgRouting-3.6-336791" alt="pgRouting" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

---

## Demo

<p align="center">
  <img src="https://github.com/user-attachments/assets/24084c95-17d3-442e-b675-35f66cd9f8bd" alt="NeptuneOS Demo" width="800" />
</p>

<details>
<summary><strong>Watch Full Demo Video</strong></summary>
<br>

https://github.com/user-attachments/assets/e5640712-2615-40c1-87d2-5720afe597ab

</details>

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
- [Performance](#performance)
- [Security](#security--compliance)
- [License](#license)

---

## Overview

NeptuneOS integrates critical operational domains — fleet tracking, route optimization, cargo management, crew administration, port scheduling, and financial reporting — into a single platform. Leveraging PostGIS spatial databases and pgRouting's Dijkstra-based network analysis, the system enables intelligent decision-making for complex maritime logistics.

### Core Value Proposition

- **Autonomous Route Planning** — Graph-based pathfinding calculates optimal ocean-only routes over a seeded ocean network (14 ports, ~15-node graph in the default seed data — small by design for a demo, the pgRouting/PostGIS setup scales to a much larger network without code changes)
- **Live Fleet Intelligence** — Vessel positions refresh via 2-5s HTTP polling (RTK Query) on a Mapbox GL 3D globe; a WebSocket (`/ws/fleet`, now token-authenticated) pushes a snapshot on connect plus live CRITICAL/INFO alerts
- **Predictive Maintenance** — Component-level health monitoring with entropy-based degradation modeling
- **Cargo Lifecycle Management** — Full CRUD for shipments with manifest items, BOL generation, and automatic status transitions
- **Port Berth Scheduling** — Drag-and-drop terminal allocation with conflict detection
- **Financial Analytics** — Real-time P&L reporting with revenue, fuel cost, and margin calculations

---

## System Architecture

### Technology Stack

| Layer                 | Technology                  | Purpose                                           |
| --------------------- | --------------------------- | ------------------------------------------------- |
| **API Server**        | Go 1.24 + Fiber v2          | High-throughput HTTP/WebSocket service            |
| **Database**          | PostgreSQL 16 + PostGIS 3.4 | Geospatial data persistence                       |
| **Routing Engine**    | pgRouting 3.6               | Dijkstra graph-based ocean pathfinding            |
| **Real-Time Layer**   | WebSockets (Fiber)          | Live fleet telemetry & alert streaming            |
| **Simulation Engine** | Go (background goroutine)   | Vessel movement, fuel burn, component degradation |
| **PDF Generation**    | Maroto                      | Bill of Lading document generation                |
| **Frontend**          | React 19 + TypeScript 5.9   | Type-safe UI with Vite 7                          |
| **State Management**  | Redux Toolkit + RTK Query   | Centralized state with cache invalidation         |
| **Visualization**     | Mapbox GL JS + Recharts     | 3D geospatial rendering & analytics charts        |
| **Drag & Drop**       | dnd-kit                     | Berth scheduler allocation                        |
| **Styling**           | Tailwind CSS v4             | Utility-first design system with glassmorphism    |

### Service Ports

| Service      | Port   | URL                            |
| ------------ | ------ | ------------------------------ |
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
│   │   ├── handlers/             # HTTP request handlers (12 modules)
│   │   ├── repository/           # Data access layer - raw SQL with pgx (12 repos)
│   │   ├── services/             # Business logic: CSV importer, PDF generator
│   │   ├── models/               # Domain entities (11 models)
│   │   ├── database/             # Connection pooling (pgx pool)
│   │   ├── simulator/            # Physics engine - movement, fuel, degradation
│   │   ├── navigation/           # Geospatial math (Haversine, bearings)
│   │   └── websocket/            # Hub + client management for real-time layer
│   ├── db/
│   │   ├── Dockerfile            # Custom PostgreSQL + PostGIS + pgRouting image
│   │   ├── migrations/           # 14 versioned schema migrations (golang-migrate)
│   │   └── seeds/                # Ocean network graph seed data (~15 nodes in the default seed)
│   └── go.mod
│
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── api/              # RTK Query API slice (centralized mutations/queries)
│   │   │   ├── auth/             # JWT auth state + RequireAuth route guard
│   │   │   ├── map/              # Mapbox GL globe, command deck, port inspector
│   │   │   ├── fleet/            # Cargo manifest viewer, tank monitor
│   │   │   ├── shipments/        # Shipment CRUD: form, list with edit/delete modals
│   │   │   ├── crew/             # Crew roster and vessel assignment
│   │   │   ├── port/             # Berth scheduler (drag-and-drop with dnd-kit)
│   │   │   ├── analytics/        # Alert feed, revenue charts
│   │   │   ├── notifications/    # WebSocket hook + notification state
│   │   │   └── preferences/      # User preferences state
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx   # Public marketing page
│   │   │   ├── LoginPage.tsx     # Authentication
│   │   │   ├── TrackingPage.tsx  # Public shipment tracking with map
│   │   │   └── dashboard/        # 10 dashboard views (stats, fleet, cargo, etc.)
│   │   ├── layouts/              # DashboardLayout + Sidebar
│   │   └── components/ui/        # DataTable, ToastContainer
│   ├── package.json
│   └── vite.config.ts
│
├── data/                         # CSV seed files (ports, vessels, routes, crew, etc.)
├── docker-compose.yml            # PostgreSQL + pgAdmin orchestration
└── README.md
```

---

## Key Modules

### 1. Global Command Center (Live Map)

Real-time situational awareness across the entire fleet on an interactive Mapbox GL 3D globe.

- **Live Fleet Map** — Vessel positions, headings, and speed vectors with 5-second refresh
- **Route Network Overlay** — Visualize shipping lanes and active voyage paths
- **Storm Tracking** — Weather hazard overlays for tactical route adjustments
- **Port Statistics** — Throughput analytics and terminal occupancy metrics
- **Ship Info Panel** — Click any vessel for detailed status, fuel levels, and cargo
- **Command Deck** — Side panel showing active voyages and port congestion monitors
- **Fleet Paths Toggle** — Show/hide all active route geometries on the map
- **Vessel Filters** — Filter by type (OIL tankers, BOX containers) or hide docked vessels

### 2. Intelligent Routing Engine

Autonomous pathfinding leveraging pgRouting's Dijkstra algorithm on a pre-computed ocean network graph with ~400 navigable nodes.

- **Ocean-Only Routes** — All routes follow water, never crossing land
- **Automatic Route Assignment** — Creating a shipment auto-calculates the optimal route, assigns it to the vessel, and starts the voyage
- **Multi-Segment Route Merging** — `ST_LineMerge` converts pgRouting's MultiLineString output into clean LineString geometries
- **Spherical Distance** — Haversine formula for accurate great-circle distance calculations

### 3. Cargo & Shipment Management

Full lifecycle management from manifest creation through delivery.

- **Shipment CRUD** — Create, read, update, and delete shipments with confirmation modals
- **Manifest Items** — JSONB-stored line items with SKU, description, quantity, and unit value
- **Bill of Lading (BOL)** — PDF generation and download via the Maroto library
- **Smart Status Transitions** — Automatic PENDING → IN_TRANSIT when vessel departs, IN_TRANSIT → DELIVERED on arrival
- **Public Tracking** — Anyone can track a shipment by tracking number (no auth required)
- **Vessel Assignment** — Assign shipments to specific vessels, with automatic route calculation

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
- **Distress Detection** — Vessel enters DISTRESS state on critical component failure
- **Recovery Workflow** — Vessels auto-recover from DISTRESS after repairs and refueling

### 6. Crew Management

Personnel administration with vessel assignments and role tracking.

- **Crew Roster** — Full listing with name, role, license, nationality, and status
- **Vessel Assignment** — Assign crew members to specific vessels
- **Role Hierarchy** — Captain, Chief Engineer, First Officer, Deckhand, Cook
- **Status Tracking** — Active, On Leave, and Retired states
- **CSV Bulk Import** — Onboard entire crew lists from CSV files

### 7. Port & Berth Scheduling

Terminal management with drag-and-drop berth allocation.

- **Terminal Directory** — Browse terminals by port with type classification (Container, Liquid, Bulk)
- **Berth Allocation** — Schedule vessel arrivals with start/end times and notes
- **Drag-and-Drop** — Visual scheduler powered by dnd-kit for intuitive allocation
- **Conflict Detection** — Prevent overlapping berth bookings
- **Auto-Activation** — Berth status automatically updates when vessels arrive at port

### 8. Financial Analytics

Real-time P&L dashboard with operational cost modeling.

- **Revenue Tracking** — Freight rate calculations based on cargo weight ($/kg)
- **Fuel Cost Modeling** — Bunker fuel consumption at $600/ton with dynamic burn rates
- **Gross Profit** — Automated P&L: Revenue - Operating Costs
- **KPI Dashboard** — Active jobs, completed shipments, fuel consumed, average revenue per job
- **Interactive Charts** — Recharts-powered visualizations. The KPI
  numbers above are real, computed from the database; the 7-day revenue
  trend line chart itself is currently hardcoded mock data
  (`FinancePage.tsx`, `RevenueChart.tsx`), not wired to real historical
  data yet

### 9. Data Management

Centralized CSV import system for initial data seeding and bulk operations.

- **Multi-Entity Import** — Ports, vessels, routes, crew, shipments, and users
- **Validation** — Header parsing with field-level validation
- **Bulk Operations** — Efficient batch processing via repository layer

### 10. Real-Time Simulation Engine

Background physics engine that powers the entire live fleet experience.

- **Vessel Movement** — Route-following with progress-based interpolation along LineString geometries
- **Fuel Consumption** — Burn rate scales with vessel speed: `0.5 × (speed / 20.0)` tons per tick
- **Component Degradation** — Probabilistic entropy applied to all ship components each tick
- **Distress Detection** — Automatic DISTRESS state on fuel depletion or critical component failure
- **Arrival Handling** — Auto-dock vessels at destination, update shipment status to DELIVERED
- **WebSocket Alerts** — Broadcasts CRITICAL and INFO notifications to all connected clients
- **Deduplication** — Alert tracking prevents duplicate notifications per vessel

---

## Data Model

### Entity Relationship Overview

```
Ports ──────────── Terminals ──────── Berths
  │                                     │
  │ origin/destination                  │ allocation
  │                                     │
Shipments ─────── Vessels ────────── BerthAllocations
  │                 │
  │ manifest        │ assignment
  │                 │
ManifestItems     Components
(JSONB)             │
                  Crew
                    │
                  Users (auth)
```

### Core Entities

| Entity              | Key Fields                                                                                                                                              | Notes                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Vessel**          | `id`, `name`, `imo_number`, `type`, `status`, `location` (POINT), `heading`, `speed_knots`, `fuel_level/capacity`, `current_route_id`, `route_progress` | 5 statuses: AT_SEA, DOCKED, ANCHORED, MAINTENANCE, DISTRESS   |
| **Port**            | `id`, `un_locode`, `name`, `country`, `location` (POINT), `type`                                                                                        | 14 ports in the default seed data                              |
| **Route**           | `id`, `name`, `path` (LINESTRING), `origin_port_id`, `destination_port_id`                                                                              | Computed via pgRouting Dijkstra                               |
| **Shipment**        | `id`, `tracking_number`, `customer_name`, `origin/destination_port_id`, `vessel_id`, `status`, `weight_kg`, `manifest_items` (JSONB), `eta`             | Statuses: PENDING, IN_TRANSIT, DELIVERED                      |
| **ManifestItem**    | `sku`, `description`, `quantity`, `unit_value`, `total_value`                                                                                           | Stored as JSONB array in Shipment                             |
| **Terminal**        | `id`, `port_id`, `name`, `type`                                                                                                                         | Types: CONTAINER, LIQUID, BULK, GENERAL                       |
| **Berth**           | `id`, `terminal_id`, `name`, `length_meters`, `is_occupied`, `current_vessel_id`                                                                        | Nested under Terminal                                         |
| **BerthAllocation** | `id`, `vessel_id`, `berth_id`, `start_time`, `end_time`, `status`, `notes`                                                                              | Statuses: SCHEDULED, ACTIVE, COMPLETED, CANCELLED             |
| **Component**       | `id`, `vessel_id`, `name`, `type`, `health_percentage`, `status`, `total_operating_hours`, `last_maintenance`                                           | Types: PROPULSION, ELECTRICAL, NAVIGATION, HULL               |
| **Crew**            | `id`, `name`, `role`, `license_number`, `nationality`, `vessel_id`, `status`                                                                            | Roles: CAPTAIN, CHIEF_ENGINEER, FIRST_OFFICER, DECKHAND, COOK |
| **User**            | `id`, `email`, `password_hash`, `full_name`, `company_name`, `role`                                                                                     | Auth entity with bcrypt hashing                               |
| **FinancialStats**  | `total_revenue`, `total_fuel_cost`, `gross_profit`, `active_job_count`, `avg_revenue_per_job`                                                           | Computed via SQL aggregation                                  |

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
VITE_API_URL=http://127.0.0.1:8080
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

### Step 2: Start Database

```bash
docker-compose up -d --build
```

This starts:

- **PostgreSQL 16** with PostGIS + pgRouting on port `5455`
- **pgAdmin** on port `5050` (login: `admin@neptune.com` / `password123`)

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

Navigate to `http://localhost:5173/login` and use:

```
Email:    admin@neptune.com
Password: admin123
```

---

## API Reference

### Authentication

All protected endpoints require: `Authorization: Bearer <token>`

| Method | Endpoint          | Auth | Description                  |
| ------ | ----------------- | ---- | ---------------------------- |
| `POST` | `/api/auth/login` | No   | Authenticate and receive JWT |

### Fleet Operations

| Method | Endpoint                            | Auth | Description                    |
| ------ | ----------------------------------- | ---- | ------------------------------ |
| `GET`  | `/api/vessels`                      | Yes  | List all vessels               |
| `GET`  | `/api/vessels/:id`                  | No   | Get vessel details             |
| `POST` | `/api/vessels`                      | Yes  | Create a new vessel            |
| `POST` | `/api/vessels/:id/refuel`           | Yes  | Refuel vessel to full capacity |
| `GET`  | `/api/vessels/:vesselId/tanks`      | Yes  | Get vessel tank levels         |
| `GET`  | `/api/vessels/:vesselId/components` | Yes  | Get vessel components          |
| `GET`  | `/api/vessels/:id/crew`             | Yes  | Get crew assigned to vessel    |
| `GET`  | `/api/vessels/:vesselId/shipments`  | Yes  | Get vessel cargo manifest      |

### Routing

| Method | Endpoint                | Auth | Description                                              |
| ------ | ----------------------- | ---- | -------------------------------------------------------- |
| `GET`  | `/api/routes/network`   | No   | Get full ocean network mesh (GeoJSON)                    |
| `POST` | `/api/routes/calculate` | No   | Calculate route between two coordinates                  |
| `GET`  | `/api/routes/active`    | No   | Get all active voyage routes (GeoJSON FeatureCollection) |
| `GET`  | `/api/routes/:id`       | No   | Get specific route by ID                                 |

### Cargo & Shipments

| Method   | Endpoint                             | Auth | Description                          |
| -------- | ------------------------------------ | ---- | ------------------------------------ |
| `GET`    | `/api/shipments/:trackingNumber`     | No   | Public shipment tracking             |
| `GET`    | `/api/shipments`                     | Yes  | List all shipments                   |
| `POST`   | `/api/shipments`                     | Yes  | Create shipment (auto-routes vessel) |
| `PUT`    | `/api/shipments/:id`                 | Yes  | Update shipment                      |
| `DELETE` | `/api/shipments/:id`                 | Yes  | Delete shipment                      |
| `GET`    | `/api/shipments/:trackingNumber/bol` | Yes  | Download Bill of Lading (PDF)        |

### Ports & Scheduling

| Method | Endpoint                       | Auth | Description                           |
| ------ | ------------------------------ | ---- | ------------------------------------- |
| `GET`  | `/api/ports`                   | Yes  | List all ports                        |
| `GET`  | `/api/ports/stats`             | Yes  | Port throughput statistics            |
| `GET`  | `/api/ports/:portId/terminals` | Yes  | Get port terminals and berths         |
| `GET`  | `/api/ports/:portId/schedule`  | Yes  | Get port berth schedule               |
| `POST` | `/api/allocations`             | Yes  | Create berth allocation               |
| `GET`  | `/api/allocations/unassigned`  | Yes  | Get vessels without berth assignments |

### Other

| Method | Endpoint                       | Auth | Description                      |
| ------ | ------------------------------ | ---- | -------------------------------- |
| `POST` | `/api/components/:id/maintain` | Yes  | Perform maintenance on component |
| `GET`  | `/api/crew`                    | Yes  | List all crew members            |
| `GET`  | `/api/finance/stats`           | Yes  | Get financial KPIs               |
| `GET`  | `/health`                      | No   | Server health check              |

### WebSocket

```
ws://localhost:8080/ws/fleet
```

Message types:

- `FLEET_UPDATE` — Vessel positions, headings, speeds, fuel levels (every 5s)
- `ALERT` — Critical notifications with level, message, vessel ID, and timestamp

---

## Operational Workflows

### Creating a Shipment (Automatic Voyage Start)

1. Navigate to **Dashboard → Cargo**
2. Fill in the shipment form: origin port, destination port, vessel, customer, weight, manifest items
3. Submit — the backend automatically:
   - Calculates the optimal ocean route via pgRouting
   - Assigns the route to the selected vessel
   - Sets the vessel status to `AT_SEA` with full fuel
   - Transitions the shipment to `IN_TRANSIT`
   - Updates any other PENDING shipments on the same vessel
4. The vessel immediately begins moving along the route on the live map

### Monitoring Fleet Health

1. Navigate to **Dashboard → Maintenance**
2. View component health matrix across all vessels
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
5. When a vessel arrives at the port, the allocation auto-activates

---

## Performance

| Metric                | Value                                 |
| --------------------- | ------------------------------------- |
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

- **Authentication** — JWT-based stateless auth with configurable secret
- **Authorization** — role-based (`ADMIN`/`CLIENT`) middleware on
  destructive/administrative endpoints (vessel and port mutations, CSV
  import, component maintenance, berth allocation, crew assignment,
  shipment update/delete); reads and tracking stay open to any
  authenticated user. `/ws/fleet` requires a valid token too, passed as
  a query param since a browser WebSocket handshake can't carry a
  header.
- **Password Security** — bcrypt hashing (cost factor 10)
- **Route Protection** — `RequireAuth` guard on all dashboard routes
- **CORS** — Restricted to `localhost:5173` and `127.0.0.1:5173`
- **SQL Injection Prevention** — Parameterized queries throughout (pgx)
- **Environment Config** — All secrets via `.env` files (never committed)

---

## License

MIT License — Copyright (c) 2026 NeptuneOS

---

**NeptuneOS** — Powering the future of autonomous maritime logistics.
