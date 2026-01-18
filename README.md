# NeptuneShipments 

> Full-stack maritime logistics platform with real-time vessel tracking, route simulation, and cargo management.

**Stack**: Go (Fiber) • React (Vite) • PostgreSQL + PostGIS • Mapbox GL JS

---

## Features

### Core Capabilities

- **Live Fleet Tracking**: Real-time vessel positions on a 3D globe with heading indicators
- **Route Simulation**: Ships follow pre-defined ocean routes (e.g., Suez → Rotterdam)
- **Cargo Management**: Create shipments, assign to vessels, track delivery status
- **Customer Portal**: Public tracking page for shipment visibility
- **Smart ETA**: Distance-based arrival predictions using spherical geometry

### Technical Highlights

- **PostGIS Integration**: Earth-aware distance calculations with `GEOGRAPHY(POINT, 4326)`
- **Background Simulation**: Go goroutine engine updates vessel positions every 5 seconds
- **Route Interpolation**: Uses `ST_LineInterpolatePoint` for smooth path movement
- **Auto-Docking**: Automatic status transitions when ships reach destinations

---

## Architecture

```
NeptuneShipments/
├── backend/              # Go API (Fiber + pgx)
│   ├── cmd/
│   │   ├── api/          # Main server
│   │   └── seeder/       # Database seeding tool
│   ├── internal/
│   │   ├── handlers/     # HTTP handlers
│   │   ├── repository/   # SQL queries (NO ORMs)
│   │   ├── models/       # Data structures
│   │   ├── database/     # Connection pooling
│   │   ├── simulator/    # Background engine
│   │   └── navigation/   # Haversine math
│   └── db/migrations/    # golang-migrate schemas
│
├── frontend/             # React SPA (Vite + TypeScript)
│   ├── src/
│   │   ├── features/
│   │   │   ├── api/      # RTK Query
│   │   │   ├── map/      # Mapbox components
│   │   │   └── shipments/
│   │   └── pages/
│   │       ├── Dashboard.tsx
│   │       └── TrackingPage.tsx
│
└── docker-compose.yml    # PostgreSQL + pgAdmin
```

---

## Quick Start

### Prerequisites

- Go 1.24+
- Node.js 20+
- Docker Desktop

### 1. Start Database

```bash
docker-compose up -d
```

### 2. Backend Setup

```bash
cd backend

# Create .env file
cat > .env << EOF
DB_URL=postgres://postgres:password123@localhost:5455/neptune_shipments?sslmode=disable
PORT=8080
ENVIRONMENT=development
EOF

# Run migrations
migrate -path db/migrations -database "postgres://postgres:password123@localhost:5455/neptune_shipments?sslmode=disable" up

# Seed data
go run cmd/seeder/main.go

# Start API
go run cmd/api/main.go
```

**API Running**: http://localhost:8080

### 3. Frontend Setup

```bash
cd frontend

# Create .env file
cat > .env << EOF
VITE_MAPBOX_TOKEN=your_mapbox_token_here
EOF

# Install & run
npm install
npm run dev
```

**Dashboard**: http://localhost:5173

---

## Database Schema

### Vessels

```sql
id                UUID PRIMARY KEY
name              VARCHAR(255)
imo_number        VARCHAR(20) UNIQUE
location          GEOGRAPHY(POINT, 4326)
heading           FLOAT (0-360°)
speed_knots       FLOAT
current_route_id  UUID → routes(id)
route_progress    FLOAT (0.0 - 1.0)
```

### Routes

```sql
id    UUID PRIMARY KEY
name  VARCHAR(255) UNIQUE
path  GEOGRAPHY(LINESTRING, 4326)
```

### Shipments

```sql
id                  UUID PRIMARY KEY
tracking_number     VARCHAR(50) UNIQUE
origin_port_id      UUID → ports(id)
destination_port_id UUID → ports(id)
vessel_id           UUID → vessels(id)
status              ENUM (PENDING, IN_TRANSIT, DELIVERED)
eta                 TIMESTAMP
```

---

## API Endpoints

### Vessels

- `POST /api/vessels` - Create vessel
- `GET /api/vessels` - List all vessels
- `GET /api/vessels/:id` - Get single vessel

### Ports

- `GET /api/ports` - List all ports

### Shipments

- `POST /api/shipments` - Create shipment
- `GET /api/shipments` - List all shipments
- `GET /api/shipments/:trackingNumber` - Track shipment

### Routes

- `GET /api/routes/:id` - Get route geometry (GeoJSON)

---

## Testing

### Sample cURL Requests

**Create a Container Ship**:

```bash
curl -X POST http://localhost:8080/api/vessels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MSC Gülsün",
    "imo_number": "IMO9811000",
    "flag_country": "PA",
    "type": "CONTAINER",
    "status": "AT_SEA",
    "capacity_teu": 23756,
    "latitude": 35.8617,
    "longitude": 14.5253,
    "heading": 90.5,
    "speed_knots": 18.2
  }'
```

**Track a Shipment**:

```bash
curl http://localhost:8080/api/shipments/TRK-TEST-01
```

---

## Technology Stack

| Layer          | Technology                | Purpose                      |
| -------------- | ------------------------- | ---------------------------- |
| **Backend**    | Go 1.24 + Fiber v2        | High-performance HTTP server |
| **Database**   | PostgreSQL 16 + PostGIS   | Geospatial queries           |
| **Driver**     | pgx/v5                    | Native PostgreSQL driver     |
| **Migrations** | golang-migrate            | Version-controlled schema    |
| **Frontend**   | React 18 + Vite           | Fast dev experience          |
| **State**      | Redux Toolkit + RTK Query | Data fetching & caching      |
| **Maps**       | Mapbox GL JS              | 3D globe rendering           |
| **Styling**    | Tailwind CSS v4           | Utility-first CSS            |

---

## Roadmap

### Phase 12 (Next)

- [ ] User Authentication (JWT)
- [ ] Role-Based Access Control (Admin vs Customer)
- [ ] Multi-vessel route optimization
- [ ] Weather data integration

### Future Enhancements

- [ ] Real-time WebSocket updates
- [ ] Liquid cargo tank monitoring (for tankers)
- [ ] Customs clearance workflows
- [ ] Mobile app (React Native)

---

## License

MIT License - See [LICENSE](LICENSE)

---

## Contributing

This is a demonstration project. For production use, consider:

- Adding rate limiting
- Implementing proper authentication
- Using environment-based configs
- Adding comprehensive test coverage
