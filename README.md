# NeptuneOS

> Enterprise Maritime Logistics & Fleet Management Platform

**NeptuneOS** is a comprehensive ERP system designed for autonomous shipping operations at global scale. Built on real-time geospatial intelligence, graph-based routing algorithms, and predictive maintenance analytics, it provides unified command and control for modern maritime fleets.

---

## Overview

NeptuneOS integrates critical operational domains—fleet tracking, route optimization, cargo management, crew administration, and financial reporting—into a single platform. Leveraging PostGIS spatial databases and pgRouting's network analysis capabilities, the system enables intelligent decision-making for complex maritime logistics operations.

### Core Value Proposition

- **Autonomous Route Planning**: Graph-based pathfinding engine calculates optimal water-only routes between global ports
- **Real-Time Fleet Intelligence**: Sub-second telemetry updates with geospatial physics simulation
- **Predictive Maintenance**: Component-level health monitoring with entropy-based degradation modeling
- **Integrated Operations**: Single source of truth spanning logistics, engineering, HR, and finance

---

## System Architecture

### Technology Stack

| Layer                | Technology                | Purpose                                    |
| -------------------- | ------------------------- | ------------------------------------------ |
| **API Server**       | Go 1.24 + Fiber v2        | High-throughput HTTP service               |
| **Database**         | PostgreSQL 16 + PostGIS   | Geospatial data persistence                |
| **Routing Engine**   | pgRouting 3.6             | Graph-based pathfinding algorithms         |
| **Real-Time Layer**  | WebSockets (Fiber)        | Live telemetry streaming                   |
| **Frontend**         | React 18 + TypeScript     | Type-safe UI framework                     |
| **State Management** | Redux Toolkit + RTK Query | Centralized application state              |
| **Visualization**    | Mapbox GL JS + Recharts   | 3D geospatial rendering & analytics charts |
| **Styling**          | Tailwind CSS v4           | Utility-first design system                |

### Project Structure

```
NeptuneOS/
├── backend/
│   ├── cmd/
│   │   ├── api/              # HTTP server entrypoint
│   │   └── seeder/           # Database initialization tool
│   ├── internal/
│   │   ├── handlers/         # HTTP request handlers
│   │   ├── repository/       # Data access layer (raw SQL)
│   │   ├── services/         # Business logic & CSV importer
│   │   ├── models/           # Domain entities
│   │   ├── database/         # Connection pooling
│   │   ├── simulator/        # Physics engine (background worker)
│   │   ├── navigation/       # Geospatial calculations
│   │   └── websocket/        # Real-time communication layer
│   ├── db/
│   │   └── migrations/       # Schema version control (golang-migrate)
│   └── data/                 # CSV seed data (ports, vessels, routes)
│
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── api/          # RTK Query API definitions
│   │   │   ├── auth/         # Authentication state management
│   │   │   ├── map/          # Mapbox integration components
│   │   │   ├── notifications/# WebSocket alert system
│   │   │   └── analytics/    # Financial reporting modules
│   │   ├── pages/
│   │   │   └── dashboard/    # Command center views
│   │   ├── layouts/          # Application shell components
│   │   └── components/       # Reusable UI elements
│   └── public/               # Static assets
│
├── docker-compose.yml        # Development environment orchestration
└── .env.example              # Configuration template
```

---

## Key Modules

### 1. Global Command Center

A unified operations dashboard providing real-time situational awareness across the entire fleet.

**Capabilities:**

- **Live Fleet Map**: 3D globe visualization with vessel positions, headings, and speed vectors
- **Route Network**: Visual representation of shipping lanes computed via pgRouting
- **Weather Integration**: Storm tracking overlays for tactical route adjustments
- **Port Statistics**: Throughput analytics and terminal occupancy metrics

**Technical Implementation:**

- Mapbox GL JS with custom WebGL layers for performance optimization
- WebSocket-based position updates (5-second refresh cycle)
- GeoJSON feature rendering for routes and hazard zones

### 2. Intelligent Routing Engine

Autonomous pathfinding system leveraging pgRouting's Dijkstra algorithm to compute water-traversable routes between any two global ports.

**Capabilities:**

- **Graph-Based Navigation**: Treats ocean regions as a navigable network with ~400 nodes
- **Constraint-Aware Routing**: Respects vessel draft limits, canal restrictions, and sovereign waters
- **Multi-Modal Optimization**: Balances distance, fuel consumption, and transit time

**Technical Implementation:**

- PostGIS `GEOGRAPHY(LINESTRING, 4326)` for route geometries
- pgRouting `pgr_dijkstra` queries on pre-computed shipping lane graph
- Spherical distance calculations using Haversine formula

### 3. Liquid Logistics Module

Specialized system for tanker operations, monitoring liquid cargo from loading to discharge.

**Capabilities:**

- **Tank-Level Monitoring**: Real-time ullage tracking across multiple compartments
- **Thermal Management**: Temperature sensor integration for sensitive cargoes
- **Pumping Operations**: Flow rate monitoring and automated valve control logging
- **Cargo Integrity**: Automatic alerts for anomalous conditions

**Technical Implementation:**

- Per-vessel tank inventory with capacity/level tracking
- Time-series data storage for trend analysis
- Integration with vessel telemetry stream

### 4. Engineering & Maintenance System

Predictive maintenance framework using entropy-based degradation modeling to forecast component failures.

**Capabilities:**

- **Component Health Tracking**: Individual monitoring of engines, pumps, generators, navigation systems
- **Entropy Engine**: Probabilistic degradation simulation (0.1% per simulation tick)
- **Critical Failure Detection**: Automatic "Distress" state activation on sub-threshold health levels
- **Maintenance Scheduling**: Work order generation based on predictive analytics

**Technical Implementation:**

- Component health modeled as `health_percentage` (0-100)
- Background degradation applied by simulator engine
- Threshold-based alerting system via WebSocket notifications

### 5. Human Resources Management

Comprehensive crew administration system tracking personnel assignments, qualifications, and compliance.

**Capabilities:**

- **Crew Rostering**: Assignment tracking by vessel with rank hierarchy
- **License Management**: Certification expiry monitoring and renewal workflows
- **Nationality Compliance**: Regulatory adherence for international waters transit
- **Skill Matrix**: Competency tracking for operational planning

**Technical Implementation:**

- Relational data model linking crew → vessels
- CSV-based bulk import for initial crew onboarding
- CRUD operations via RESTful API

### 6. Financial Analytics Dashboard

Real-time profit & loss reporting with operational cost modeling and revenue forecasting.

**Capabilities:**

- **Revenue Tracking**: Freight rate calculations based on cargo weight ($/kg)
- **Fuel Cost Modeling**: Bunker fuel consumption tracking with dynamic pricing ($600/ton)
- **Gross Profit Calculation**: Automated P&L generation (Revenue - Operating Costs)
- **KPI Visualization**: Interactive charts for margin analysis and trend forecasting

**Technical Implementation:**

- SQL-based aggregation queries for real-time calculations
- Recharts library for interactive data visualization
- Polling-based updates (5-second refresh)

---

## Data Model

### Core Entities

#### Vessels

```sql
id                UUID PRIMARY KEY
name              VARCHAR(255) NOT NULL
imo_number        VARCHAR(20) UNIQUE
type              VARCHAR(50) -- CONTAINER, TANKER, BULK
status            VARCHAR(50) -- AT_SEA, DOCKED, DISTRESS
location          GEOGRAPHY(POINT, 4326)
heading           FLOAT -- Degrees (0-360)
speed_knots       FLOAT
fuel_level        FLOAT
fuel_capacity     FLOAT
current_route_id  UUID REFERENCES routes(id)
route_progress    FLOAT -- 0.0 to 1.0
```

#### Routes

```sql
id          UUID PRIMARY KEY
name        VARCHAR(255) UNIQUE
origin_id   UUID REFERENCES ports(id)
destination_id UUID REFERENCES ports(id)
path        GEOGRAPHY(LINESTRING, 4326)
distance_nm FLOAT -- Nautical miles
```

#### Ports

```sql
id          UUID PRIMARY KEY
name        VARCHAR(255) UNIQUE
code        VARCHAR(10) UNIQUE
location    GEOGRAPHY(POINT, 4326)
country     VARCHAR(100)
type        VARCHAR(50) -- COMMERCIAL, INDUSTRIAL, NAVAL
```

#### Shipments

```sql
id                  UUID PRIMARY KEY
tracking_number     VARCHAR(50) UNIQUE
origin_port_id      UUID REFERENCES ports(id)
destination_port_id UUID REFERENCES ports(id)
vessel_id           UUID REFERENCES vessels(id)
status              VARCHAR(50) -- PENDING, IN_TRANSIT, DELIVERED
weight_kg           FLOAT
eta                 TIMESTAMP
```

#### Components

```sql
id                UUID PRIMARY KEY
vessel_id         UUID REFERENCES vessels(id)
component_type    VARCHAR(50) -- ENGINE, PUMP, GENERATOR, NAVIGATION
health_percentage FLOAT -- 0.0 to 100.0
last_maintenance  TIMESTAMP
```

#### Crew

```sql
id             UUID PRIMARY KEY
name           VARCHAR(255)
role           VARCHAR(100) -- CAPTAIN, ENGINEER, DECKHAND
license_number VARCHAR(50)
nationality    VARCHAR(100)
vessel_id      UUID REFERENCES vessels(id)
status         VARCHAR(50) -- ACTIVE, ON_LEAVE
```

---

## Installation & Setup

### Prerequisites

- **Docker Desktop** 24.0+
- **Go** 1.24+
- **Node.js** 20+
- **golang-migrate** CLI tool

### Step 1: Environment Configuration

Create backend configuration:

```bash
cd backend
cat > .env << EOF
DB_URL=postgres://postgres:admin@localhost:5455/neptune?sslmode=disable
PORT=8080
JWT_SECRET=neptune_production_secret_key
ENVIRONMENT=development
EOF
```

Create frontend configuration:

```bash
cd frontend
cat > .env << EOF
VITE_API_URL=http://127.0.0.1:8080
VITE_MAPBOX_TOKEN=your_mapbox_token_here
EOF
```

### Step 2: Database Initialization

Start PostgreSQL with PostGIS and pgRouting extensions:

```bash
docker-compose up -d --build
```

Run database migrations:

```bash
cd backend
migrate -path db/migrations \
  -database "postgres://postgres:admin@localhost:5455/neptune?sslmode=disable" \
  up
```

### Step 3: Data Seeding

Import initial dataset (ports, vessels, routes, crew):

```bash
cd backend
go run cmd/seeder/main.go
```

Expected output:

```
✅ Imported 180 Ports
✅ Imported 15 Vessels
✅ Imported 12 Routes
✅ Imported 45 Crew Members
🌊 Shipping Network Graph Created (400 nodes)
```

### Step 4: Start Services

**Backend API Server:**

```bash
cd backend/cmd/api
go run main.go
```

API available at: `http://localhost:8080`

**Frontend Development Server:**

```bash
cd frontend
npm install
npm run dev
```

Dashboard available at: `http://localhost:5173`

---

## API Reference

### Authentication

All protected endpoints require JWT authentication via `Authorization: Bearer <token>` header.

**Login:**

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@neptune.com",
  "password": "admin123"
}
```

### Fleet Operations

**List All Vessels:**

```http
GET /api/vessels
Authorization: Bearer <token>
```

**Get Vessel Details:**

```http
GET /api/vessels/:id
Authorization: Bearer <token>
```

**Refuel Vessel:**

```http
POST /api/vessels/:id/refuel
Authorization: Bearer <token>
```

### Routing Engine

**Calculate Route:**

```http
POST /api/routes/calculate
Authorization: Bearer <token>
Content-Type: application/json

{
  "origin_port_id": "uuid",
  "destination_port_id": "uuid"
}
```

**Get Active Routes (GeoJSON):**

```http
GET /api/routes/active
Authorization: Bearer <token>
```

### Cargo Management

**Create Shipment:**

```http
POST /api/shipments
Authorization: Bearer <token>
Content-Type: application/json

{
  "origin_port_id": "uuid",
  "destination_port_id": "uuid",
  "vessel_id": "uuid",
  "weight_kg": 25000,
  "cargo_type": "ELECTRONICS"
}
```

**Track Shipment (Public):**

```http
GET /api/shipments/:tracking_number
```

### Financial Analytics

**Get Financial Statistics:**

```http
GET /api/finance/stats
Authorization: Bearer <token>
```

Response:

```json
{
  "total_revenue": 2450000.0,
  "total_fuel_cost": 840000.0,
  "gross_profit": 1610000.0,
  "active_job_count": 23,
  "profit_margin": 65.7
}
```

### Real-Time Updates

**WebSocket Connection:**

```
ws://localhost:8080/ws/fleet
```

Message types:

- `FLEET_UPDATE`: Vessel position updates
- `ALERT`: Critical notifications (fuel depletion, mechanical failure, arrival)

---

## Operational Workflows

### Scenario 1: Creating a New Shipment

1. Navigate to **Cargo Management** dashboard
2. Click "Create Shipment"
3. Select origin/destination ports from dropdown
4. Assign to available vessel
5. System automatically:
   - Calculates optimal route via pgRouting
   - Computes ETA based on distance and vessel speed
   - Generates unique tracking number
   - Updates vessel status to `IN_TRANSIT`

### Scenario 2: Monitoring Fleet Health

1. Access **Engineering Dashboard**
2. View component health matrix for all vessels
3. System highlights components below 30% health
4. Click "Perform Maintenance" to reset component health to 100%
5. Maintenance log automatically recorded with timestamp

### Scenario 3: Responding to Critical Alerts

1. Real-time toast notification appears (e.g., "Ever Given has run out of fuel")
2. Click notification to view vessel details
3. Vessel status automatically changed to `DISTRESS`
4. Dispatch refueling operation or tugboat assistance
5. Post-refuel, status resets to `AT_SEA`

---

## Performance Characteristics

### Simulation Engine

- **Update Frequency**: 5-second tick rate
- **Concurrent Vessels**: Tested up to 500 simultaneous entities
- **Route Calculation**: <100ms for trans-oceanic routes (pgRouting)

### Database Queries

- **Spatial Queries**: Optimized with `GIST` indexes on `GEOGRAPHY` columns
- **Connection Pooling**: 20 max connections (pgx pool)
- **Average Response Time**: <50ms for standard CRUD operations

### Frontend Performance

- **Initial Load**: <2 seconds (code-split routes)
- **WebSocket Latency**: <100ms for real-time updates
- **Map Rendering**: 60 FPS with hardware acceleration

---

## Security & Compliance

### Authentication & Authorization

- JWT-based stateless authentication
- Role-Based Access Control (RBAC) with `admin` and `user` roles
- Password hashing using bcrypt (cost factor: 10)

### Data Protection

- Environment-based configuration (no hardcoded secrets)
- CORS restrictions to whitelisted origins
- SQL injection prevention via parameterized queries

### Audit Logging

- All state-changing operations logged with timestamps
- Maintenance records tracked per component
- Shipment status transitions recorded

---

## License

MIT License - Copyright (c) 2026 NeptuneOS

---

**NeptuneOS** — Powering the future of autonomous maritime logistics.

```