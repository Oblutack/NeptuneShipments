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
  }),
});

export const {
  useGetVesselsQuery,
  useCreateVesselMutation,
  useGetPortsQuery,
  useGetShipmentsQuery,
  useCreateShipmentMutation,
} = apiSlice;
