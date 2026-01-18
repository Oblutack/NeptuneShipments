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

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "http://127.0.0.1:8080/api" }),
  tagTypes: ["Vessels", "Ports", "Shipments"],
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
    // 1. Find Shipment by Tracking Number
    getShipmentByTracking: builder.query<Shipment, string>({
      query: (trackingNumber) => `/shipments/${trackingNumber}`,
    }),

    // 2. Find specific Vessel by ID
    getVesselById: builder.query<Vessel, string>({
      query: (id) => `/vessels/${id}`,
    }),
    getRouteById: builder.query<Route, string>({
      query: (id) => `/routes/${id}`,
    }),
  }),
});

export const {
  useGetVesselsQuery,
  useCreateVesselMutation,
  useGetPortsQuery,
  useGetShipmentsQuery,
  useCreateShipmentMutation,

  useLazyGetShipmentByTrackingQuery, // Lazy (Trigger manually)
  useGetVesselByIdQuery,
  useGetRouteByIdQuery,
} = apiSlice;
