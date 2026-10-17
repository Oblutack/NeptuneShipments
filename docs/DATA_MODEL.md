# Data Model

[← Back to README](../README.md)

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
| **Shipment**        | `id`, `tracking_number`, `customer_name`, `origin/destination_port_id`, `vessel_id`, `customer_user_id`, `status`, `weight_kg`, `manifest_items` (JSONB), `eta`                                      | Statuses: PENDING, IN_TRANSIT, DELIVERED; `customer_user_id` links to the CLIENT account that booked it; `tracking_number` is unique and server-issued (`NEP-` + 10 random base32 chars) unless imported from CSV |
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
