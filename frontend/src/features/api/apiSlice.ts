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
  un_locode: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
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

type RootState = {
  auth: { token: string | null };
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://127.0.0.1:8080/api",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;

      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Vessels", "Ports", "Shipments", "Routes"],
  endpoints: (builder) => ({
    getVessels: builder.query<Vessel[], void>({
      query: () => "/vessels",
      providesTags: ["Vessels"],
    }),

    getPorts: builder.query<Port[], void>({
      query: () => "/ports",
      providesTags: ["Ports"],
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
      providesTags: (result, error, vesselId) => [
        { type: "Shipments", id: vesselId },
        "Shipments",
      ],
    }),
    getPortStats: builder.query<PortStatsResponse, void>({
      query: () => "/ports/stats",
      providesTags: ["Ports"],
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
} = apiSlice;
