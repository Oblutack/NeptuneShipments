# API Reference

[← Back to README](../README.md)

### Authentication

Protected endpoints require `Authorization: Bearer <token>`. "Admin" in
the Auth column below means `requireAdmin` specifically (a CLIENT-role
token gets a 403); "Auth" alone means any authenticated user, which for
a CLIENT account is deliberately a short list: the port list, its own
shipments (list, create, Bill of Lading) and its own 2FA. Everything that
exposes the fleet, crew, schedules or finances is Admin.

| Method | Endpoint                 | Auth  | Description                                  |
| ------ | ------------------------- | ----- | --------------------------------------------- |
| `POST` | `/api/auth/login`        | No    | Authenticate and receive JWT (rate-limited)    |
| `POST` | `/api/auth/totp/setup`   | Auth  | Begin TOTP 2FA setup, returns a QR code        |
| `POST` | `/api/auth/totp/verify`  | Auth  | Confirm a TOTP code and enable 2FA             |
| `POST` | `/api/auth/totp/disable` | Auth  | Disable 2FA (requires a valid current code)    |

### Fleet Operations

| Method   | Endpoint                            | Auth  | Description                                                         |
| -------- | ------------------------------------- | ----- | ----------------------------------------------------------------------- |
| `GET`    | `/api/vessels`                       | Admin | List all vessels                                                     |
| `GET`    | `/api/vessels/:id`                   | No    | Get vessel details                                                   |
| `GET`    | `/api/vessels/template`              | Auth  | Download a CSV import template                                       |
| `POST`   | `/api/vessels`                       | Admin | Create a new vessel                                                  |
| `PUT`    | `/api/vessels/:id`                   | Admin | Update a vessel                                                      |
| `DELETE` | `/api/vessels/:id`                   | Admin | Delete a vessel (blocked if it has active shipments)                 |
| `POST`   | `/api/vessels/import`                | Admin | Bulk-import vessels from CSV                                         |
| `POST`   | `/api/vessels/:id/refuel`            | Admin | Refuel vessel to full capacity                                       |
| `GET`    | `/api/vessels/:vesselId/tanks`       | Admin | Get vessel tank levels                                                |
| `GET`    | `/api/vessels/:vesselId/components`  | Admin | Get vessel components                                                 |
| `GET`    | `/api/vessels/:id/crew`              | Admin | Get crew assigned to vessel                                           |
| `GET`    | `/api/vessels/:vesselId/shipments`   | Admin | Get vessel cargo manifest (fleet-ops view, not a client's own list)  |

### Routing

| Method | Endpoint                | Auth | Description                                              |
| ------ | ------------------------ | ---- | ---------------------------------------------------------- |
| `GET`  | `/api/routes/network`   | No   | Get full ocean network mesh (GeoJSON)                    |
| `POST` | `/api/routes/calculate` | Admin | Calculate route between two coordinates (rate-limited to 20/min)  |
| `GET`  | `/api/routes/active`    | No   | Get all active voyage routes (GeoJSON FeatureCollection) |
| `GET`  | `/api/routes/:id`       | No   | Get specific route by ID                                 |

### Cargo & Shipments

| Method   | Endpoint                               | Auth  | Description                                                                                                                                                 |
| -------- | ----------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/shipments/:trackingNumber`         | No    | Public shipment tracking - a deliberately minimal view (status, port names, ETA, weight, container number, vessel id); no customer or manifest data                                                                                                                                  |
| `GET`    | `/api/shipments/:trackingNumber/events`  | No    | Public voyage track-and-trace timeline (BOOKED, DEPARTED, DELIVERED, ...)                                                                                 |
| `GET`    | `/api/shipments`                         | Auth  | List shipments — every shipment for ADMIN, only the caller's own for CLIENT                                                                               |
| `POST`   | `/api/shipments`                         | Auth  | Create a shipment; the tracking number is issued by the server (any `tracking_number` in the body is ignored). ADMIN can assign a vessel directly (auto-routes + dispatches it); a CLIENT's booking always starts unassigned, `customer_user_id` from the JWT, not the request body |
| `PUT`    | `/api/shipments/:id`                     | Admin | Update shipment                                                                                                                                            |
| `DELETE` | `/api/shipments/:id`                     | Admin | Delete shipment                                                                                                                                            |
| `GET`    | `/api/shipments/:trackingNumber/bol`     | Auth  | Download Bill of Lading (PDF) - ADMIN, or the CLIENT who booked it; anyone else gets the same 404 as a missing shipment                                                                                                                              |

### Ports & Scheduling

| Method   | Endpoint                       | Auth  | Description                                  |
| -------- | -------------------------------- | ----- | ----------------------------------------------- |
| `GET`    | `/api/ports`                    | Auth  | List all ports                               |
| `GET`    | `/api/ports/stats`              | Admin | Port throughput statistics                   |
| `POST`   | `/api/ports`                    | Admin | Create a port                                |
| `PUT`    | `/api/ports/:id`                | Admin | Update a port                                |
| `DELETE` | `/api/ports/:id`                | Admin | Delete a port                                |
| `POST`   | `/api/ports/import`             | Admin | Bulk-import ports from CSV                   |
| `GET`    | `/api/ports/template`           | No    | Download a CSV import template               |
| `GET`    | `/api/ports/:portId/terminals`  | Admin | Get port terminals and berths                |
| `GET`    | `/api/ports/:portId/schedule`   | Admin | Get port berth schedule                      |
| `POST`   | `/api/allocations`              | Admin | Create a berth allocation (conflict-checked) |
| `GET`    | `/api/allocations/unassigned`   | Admin | Get vessels without berth assignments        |

### Crew, Finance, Maintenance, Admin

| Method | Endpoint                       | Auth  | Description                                                                                             |
| ------ | --------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/crew`                      | Admin | List all crew members                                                                                  |
| `PUT`  | `/api/crew/:id/assign`           | Admin | Assign/reassign a crew member to a vessel                                                                |
| `POST` | `/api/components/:id/maintain`   | Admin | Perform maintenance on a component (resets health to 100%)                                               |
| `GET`  | `/api/finance/stats`             | Admin | Financial KPIs, incl. live rate-card (BAF/CAF) and fuel/FX pricing                                       |
| `GET`  | `/api/finance/revenue-trend`     | Admin | Real per-day revenue for the last N days (`?days=7` default)                                             |
| `GET`  | `/api/audit`                     | Admin | Audit log of administrative actions                                                                      |
| `GET`  | `/api/alerts`                    | Admin | Persisted alert history, newest first with unresolved CRITICAL conditions ahead. `?status=open` (default: unacknowledged) or `all`; `?limit=` (default 50, max 200) |
| `POST` | `/api/alerts/:id/ack`            | Admin | Acknowledge an alert (recorded against the caller; idempotent). 404 for an unknown id                    |
| `POST` | `/api/simulation/reset`          | Admin | Clear active-voyage state (shipments/routes/berth allocations); vessels return to idle, fully fueled     |
| `GET`  | `/health`                        | No    | Server health check                                                                                      |

### WebSocket

```
ws://localhost:8080/ws/fleet?token=<jwt>
```

Admin only (a CLIENT token is rejected with 403).

Message types:

- `FLEET_UPDATE` — The full state of every vessel (positions, headings, speeds, fuel levels, route progress), sent on connect and after every simulation tick (5s). Skipped server-side when no client is connected
- `INVALIDATE` — `{"tags": [...]}`: data sets the last tick changed (`Shipments`, `Routes`, `Allocations`) that a client should refetch. Sent at most once per tick
- `ALERT` — A notification the moment it is raised, with `id`, `kind` (`OUT_OF_FUEL`, `MECHANICAL_FAILURE`, `ARRIVED`, `RECOVERED`), level, message, vessel ID/name and timestamp. The same alert is also stored and available from `GET /api/alerts`
