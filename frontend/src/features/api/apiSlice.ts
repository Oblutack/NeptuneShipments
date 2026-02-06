import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface Vessel {
  id: string;
  name: string;
  imo_number: string;
  flag_country: string;
  type: string;
  status: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed_knots: number;
  created_at: string;
  current_route_id?: string; // Optional because not all ships have routes
  route_progress?: number;
  fuel_level: number;
  fuel_capacity: number;
}

export interface Port {
  id: string;
  name: string;
  un_locode: string;
  country: string;
  type?: string; // ✅ Optional - not always present in backend
  latitude: number;
  longitude: number;
  created_at?: string;
  updated_at?: string;
}

export interface Shipment {
  id: string;
  tracking_number: string;
  customer_name: string;
  origin_port_id: string;
  destination_port_id: string;
  vessel_id?: string; // Optional
  description: string;
  weight_kg: number;
  status: string;
  eta?: string;
  container_number?: string;
  origin_port_name?: string;
  destination_port_name?: string;
}

export interface Route {
  id: string;
  name: string;
  path: {
    type: "LineString";
    coordinates: number[][];
  };
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
  role: "ADMIN" | "CLIENT";
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Tank {
  id: string;
  name: string;
  capacity_barrels: number;
  current_level: number;
  cargo_type: string;
  is_filling: boolean;
}

export interface GeoJSONFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  properties?: Record<string, unknown>;
}

export interface VesselManifest {
  vessel_id: string;
  count: number;
  shipments: Shipment[];
}

export interface PortStat {
  id: string;
  name: string;
  locode: string;
  latitude: number;
  longitude: number;
  ship_count: number;
}

export interface PortStatsResponse {
  total_ports: number;
  ports: PortStat[];
}

export interface Berth {
  id: string;
  terminal_id: string;
  name: string;
  length_meters: number;
  is_occupied: boolean;
  current_vessel_id?: string | null;
  created_at: string;
}

export interface Terminal {
  id: string;
  port_id: string;
  name: string;
  type: "CONTAINER" | "LIQUID" | "BULK";
  created_at: string;
  berths: Berth[];
}

export interface PortTerminalsResponse {
  port_id: string;
  terminal_count: number;
  terminals: Terminal[];
}

export interface Component {
  id: string;
  vessel_id: string;
  name: string;
  type: "PROPULSION" | "ELECTRICAL" | "NAVIGATION" | "HULL";
  health_percentage: number;
  status: "OPERATIONAL" | "WARNING" | "CRITICAL";
  total_operating_hours: number;
  last_maintenance: string;
  created_at: string;
  updated_at: string;
}

export interface ComponentsResponse {
  vessel_id: string;
  total_count: number;
  summary: {
    critical: number;
    warning: number;
    operational: number;
  };
  components: Component[];
}

export interface MaintenanceResponse {
  status: string;
  message: string;
  component: Component;
}

export interface CrewMember {
  id: string;
  name: string;
  role: "CAPTAIN" | "CHIEF_ENGINEER" | "FIRST_OFFICER" | "DECKHAND" | "COOK";
  license_number?: string | null;
  nationality: string;
  vessel_id?: string | null;
  vessel_name?: string;
  status: "ACTIVE" | "ON_LEAVE" | "RETIRED";
  created_at: string;
  updated_at: string;
}

export interface CrewResponse {
  total: number;
  crew: CrewMember[];
}

export interface FinancialStats {
  total_revenue: number;
  total_fuel_cost: number;
  gross_profit: number;
  active_job_count: number;
  total_shipments: number;
  completed_job_count: number;
  fuel_consumed: number;
  avg_revenue_per_job: number;
}

export interface BerthAllocation {
  id: string;
  vessel_id: string;
  berth_id: string;
  start_time: string;
  end_time: string;
  status: "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  notes: string;
  created_at: string;
  updated_at: string;
  vessel_name?: string;
  berth_name?: string;
}

export interface ScheduleResponse {
  port_id: string;
  start_date: string;
  end_date: string;
  allocations: BerthAllocation[];
}

export interface UnassignedVesselsResponse {
  count: number;
  vessels: Vessel[];
}

type RootState = {
  auth: { token: string | null };
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:8080/api", // ✅ FIX: Use localhost instead of 127.0.0.1
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;

      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Vessels", "Ports", "Shipments", "Routes", "Crew", "Allocations"],
  endpoints: (builder) => ({
    getVessels: builder.query<Vessel[], void>({
      query: () => "/vessels",
      providesTags: ["Vessels"],
    }),

    getPorts: builder.query<Port[], void>({
      query: () => "/ports",
      providesTags: ["Ports"],
    }),

    getPortById: builder.query({
      query: (id) => `/ports/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Ports", id }],
    }),

    createPort: builder.mutation({
      query: (port) => ({
        url: "/ports",
        method: "POST",
        body: port,
      }),
      invalidatesTags: ["Ports"],
    }),

    // Update Port
    updatePort: builder.mutation({
      query: ({ id, ...port }) => ({
        url: `/ports/${id}`,
        method: "PUT",
        body: port,
      }),
      invalidatesTags: ["Ports"],
    }),

    // Delete Port
    deletePort: builder.mutation({
      query: (id) => ({
        url: `/ports/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Ports"],
    }),

    // Upload Ports CSV
    uploadPortCSV: builder.mutation({
      query: (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: "/ports/import",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Ports"],
    }),

    // Download Ports Template
    downloadPortTemplate: builder.query({
      query: () => ({
        url: "/ports/template",
        responseHandler: (response) => response.blob(),
      }),
    }),

    getShipments: builder.query<Shipment[], void>({
      query: () => "/shipments",
      providesTags: ["Shipments"],
    }),
    createShipment: builder.mutation<Shipment, Partial<Shipment>>({
      query: (body) => ({
        url: "/shipments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Shipments"],
    }),

    createVessel: builder.mutation<Vessel, Partial<Vessel>>({
      query: (body) => ({
        url: "/vessels",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Vessels"],
    }),
    // Update Vessel
    updateVessel: builder.mutation({
      query: ({ id, ...vessel }) => ({
        url: `/vessels/${id}`,
        method: "PUT",
        body: vessel,
      }),
      invalidatesTags: ["Vessels"],
    }),

    // Delete Vessel
    deleteVessel: builder.mutation({
      query: (id) => ({
        url: `/vessels/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Vessels"],
    }),

    // Upload Vessels CSV
    uploadVesselCSV: builder.mutation({
      query: (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: "/vessels/import",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Vessels"],
    }),

    // Download Vessels Template
    downloadVesselTemplate: builder.query({
      query: () => ({
        url: "/vessels/template",
        responseHandler: (response) => response.blob(),
      }),
    }),
    // Find Shipment by Tracking Number
    getShipmentByTracking: builder.query<Shipment, string>({
      query: (trackingNumber) => `/shipments/${trackingNumber}`,
    }),

    // Find specific Vessel by ID
    getVesselById: builder.query<Vessel, string>({
      query: (id) => `/vessels/${id}`,
    }),
    getRouteById: builder.query<Route, string>({
      query: (id) => `/routes/${id}`,
    }),
    // Login
    login: builder.mutation<AuthResponse, { email: string; password: string }>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),
    getTanks: builder.query<Tank[], string>({
      query: (vesselId) => `/vessels/${vesselId}/tanks`,
    }),
    refuelVessel: builder.mutation<void, string>({
      query: (id) => ({
        url: `/vessels/${id}/refuel`,
        method: "POST",
      }),
      invalidatesTags: ["Vessels"],
    }),
    getNetworkMesh: builder.query<GeoJSONFeature, void>({
      query: () => "/routes/network",
    }),
    getActiveRoutes: builder.query<GeoJSONFeature, void>({
      query: () => "/routes/active",
      providesTags: ["Routes"], // We can invalidate this later if needed
    }),
    getShipmentsByVessel: builder.query<VesselManifest, string>({
      query: (vesselId) => `/vessels/${vesselId}/shipments`,
      providesTags: (_result, _error, vesselId) => [
        { type: "Shipments", id: vesselId },
        "Shipments",
      ],
    }),
    getPortStats: builder.query<PortStatsResponse, void>({
      query: () => "/ports/stats",
      providesTags: ["Ports"],
    }),
    getPortTerminals: builder.query<PortTerminalsResponse, string>({
      query: (portId) => `/ports/${portId}/terminals`,
      providesTags: (_result, _error, portId) => [
        { type: "Ports", id: portId },
        "Ports",
      ],
    }),
    getComponents: builder.query<ComponentsResponse, string>({
      query: (vesselId) => `/vessels/${vesselId}/components`,
      providesTags: (_result, _error, vesselId) => [
        { type: "Vessels", id: vesselId },
        "Vessels",
      ],
    }),
    performMaintenance: builder.mutation<MaintenanceResponse, string>({
      query: (componentId) => ({
        url: `/components/${componentId}/maintain`,
        method: "POST",
      }),
      invalidatesTags: ["Vessels"], // Refresh all vessel-related data
    }),
    getCrew: builder.query<CrewResponse, void>({
      query: () => "/crew",
      providesTags: ["Crew"],
    }),
    getCrewByVessel: builder.query<CrewResponse, string>({
      query: (vesselId) => `/vessels/${vesselId}/crew`,
      providesTags: (_result, _error, vesselId) => [
        { type: "Vessels", id: vesselId },
        "Crew",
      ],
    }),
    getFinancialStats: builder.query<FinancialStats, void>({
      query: () => "/finance/stats",
      providesTags: ["Shipments", "Vessels"], // Depends on both
    }),
    getPortSchedule: builder.query<
      ScheduleResponse,
      { portId: string; startDate?: string; endDate?: string }
    >({
      query: ({ portId, startDate, endDate }) => {
        const params = new URLSearchParams();
        if (startDate) params.append("start_date", startDate);
        if (endDate) params.append("end_date", endDate);
        return `/ports/${portId}/schedule?${params.toString()}`;
      },
      providesTags: (_result, _error, { portId }) => [
        { type: "Ports", id: portId },
        { type: "Allocations", id: "LIST" },
      ],
    }),

    getUnassignedVessels: builder.query<UnassignedVesselsResponse, void>({
      query: () => "/allocations/unassigned",
      providesTags: ["Vessels"],
    }),

    createAllocation: builder.mutation<
      BerthAllocation,
      {
        vessel_id: string;
        berth_id: string;
        start_time: string;
        duration_hours: number;
        notes?: string;
      }
    >({
      query: (body) => ({
        url: "/allocations",
        method: "POST",
        body,
      }),
      invalidatesTags: () => [
        "Ports",
        "Vessels",
        { type: "Allocations", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetVesselsQuery,
  useCreateVesselMutation,
  useGetPortsQuery,
  useGetShipmentsQuery,
  useCreateShipmentMutation,
  useLazyGetShipmentByTrackingQuery,
  useGetVesselByIdQuery,
  useGetRouteByIdQuery,
  useLoginMutation,
  useGetTanksQuery,
  useRefuelVesselMutation,
  useGetNetworkMeshQuery,
  useGetActiveRoutesQuery,
  useGetShipmentsByVesselQuery,
  useGetPortStatsQuery,
  useGetPortTerminalsQuery,
  useGetComponentsQuery,
  usePerformMaintenanceMutation,
  useGetCrewQuery,
  useGetCrewByVesselQuery,
  useGetFinancialStatsQuery,
  useUpdateVesselMutation,
  useDeleteVesselMutation,
  useUploadVesselCSVMutation,
  useLazyDownloadVesselTemplateQuery,
  useGetPortScheduleQuery,
  useDeletePortMutation,
  useUploadPortCSVMutation,
  useUpdatePortMutation,
  useLazyDownloadPortTemplateQuery,
  useGetUnassignedVesselsQuery,
  useCreateAllocationMutation,
  useCreatePortMutation,
} = apiSlice;
