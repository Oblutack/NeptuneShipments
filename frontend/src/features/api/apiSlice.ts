import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

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

export const apiSlice = createApi({
  reducerPath: 'api', 
  baseQuery: fetchBaseQuery({ baseUrl: 'http://127.0.0.1:8080/api' }),
  tagTypes: ['Vessels', 'Ports'], 
  endpoints: (builder) => ({
    
    getVessels: builder.query<Vessel[], void>({
      query: () => '/vessels',
      providesTags: ['Vessels'], 
    }),

    getPorts: builder.query<Port[], void>({
        query: () => '/ports',
        providesTags: ['Ports'],
    }),

    createVessel: builder.mutation<Vessel, Partial<Vessel>>({
      query: (body) => ({
        url: '/vessels',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Vessels'], 
    }),
  }),
});

export const { useGetVesselsQuery, useCreateVesselMutation, useGetPortsQuery } = apiSlice;