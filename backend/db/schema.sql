--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4 (Debian 16.4-1.pgdg110+2)
-- Dumped by pg_dump version 16.4 (Debian 16.4-1.pgdg110+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: crew_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.crew_role AS ENUM (
    'CAPTAIN',
    'CHIEF_ENGINEER',
    'FIRST_OFFICER',
    'DECKHAND',
    'COOK'
);


--
-- Name: shipment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shipment_status AS ENUM (
    'PENDING',
    'IN_TRANSIT',
    'CUSTOMS_HOLD',
    'DELIVERED',
    'CANCELLED'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'ADMIN',
    'CLIENT',
    'CAPTAIN'
);


--
-- Name: vessel_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vessel_status AS ENUM (
    'AT_SEA',
    'DOCKED',
    'ANCHORED',
    'MAINTENANCE',
    'DISTRESS'
);


--
-- Name: vessel_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vessel_type AS ENUM (
    'TANKER',
    'CONTAINER',
    'BULK',
    'LNG'
);


--
-- Name: update_berth_allocation_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_berth_allocation_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    actor_email character varying(255) NOT NULL,
    action character varying(100) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id character varying(100),
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: berth_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.berth_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vessel_id uuid NOT NULL,
    berth_id uuid NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    status character varying(50) DEFAULT 'SCHEDULED'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT valid_time_range CHECK ((end_time > start_time))
);


--
-- Name: berths; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.berths (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    terminal_id uuid NOT NULL,
    name character varying(50) NOT NULL,
    length_meters double precision,
    is_occupied boolean DEFAULT false,
    current_vessel_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vessel_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    health_percentage double precision DEFAULT 100.0 NOT NULL,
    status character varying(20) DEFAULT 'OPERATIONAL'::character varying NOT NULL,
    total_operating_hours double precision DEFAULT 0,
    last_maintenance timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: crew; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crew (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    role public.crew_role NOT NULL,
    license_number character varying(50),
    nationality character varying(50),
    vessel_id uuid,
    status character varying(50) DEFAULT 'ACTIVE'::character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    cert_expiry_date date
);


--
-- Name: ocean_network; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ocean_network (
    id integer NOT NULL,
    source integer,
    target integer,
    cost double precision,
    reverse_cost double precision,
    geom public.geometry(LineString,4326)
);


--
-- Name: ocean_network_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ocean_network_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ocean_network_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ocean_network_id_seq OWNED BY public.ocean_network.id;


--
-- Name: ocean_network_vertices_pgr; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ocean_network_vertices_pgr (
    id bigint NOT NULL,
    cnt integer,
    chk integer,
    ein integer,
    eout integer,
    the_geom public.geometry(Point,4326)
);


--
-- Name: ocean_network_vertices_pgr_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ocean_network_vertices_pgr_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ocean_network_vertices_pgr_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ocean_network_vertices_pgr_id_seq OWNED BY public.ocean_network_vertices_pgr.id;


--
-- Name: ports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    un_locode character varying(5) NOT NULL,
    name character varying(255) NOT NULL,
    country character varying(2) NOT NULL,
    location public.geography(Point,4326),
    timezone character varying(50),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    origin_port_id uuid,
    destination_port_id uuid,
    path public.geography(LineString,4326),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version bigint NOT NULL,
    dirty boolean NOT NULL
);


--
-- Name: shipment_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipment_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shipment_id uuid NOT NULL,
    event_type character varying(50) NOT NULL,
    description text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: shipments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tracking_number character varying(50) NOT NULL,
    customer_name character varying(255) NOT NULL,
    origin_port_id uuid NOT NULL,
    destination_port_id uuid NOT NULL,
    vessel_id uuid,
    description text,
    container_number character varying(11),
    weight_kg double precision,
    status public.shipment_status DEFAULT 'PENDING'::public.shipment_status NOT NULL,
    eta timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    client_id uuid,
    manifest_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    customer_user_id uuid
);


--
-- Name: COLUMN shipments.manifest_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipments.manifest_items IS 'Array of manifest items with SKU, description, quantity, unit_value, and total_value';


--
-- Name: tanks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tanks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vessel_id uuid NOT NULL,
    name character varying(50) NOT NULL,
    capacity_barrels double precision NOT NULL,
    current_level double precision DEFAULT 0 NOT NULL,
    cargo_type character varying(100) DEFAULT 'Empty'::character varying,
    temperature_c double precision DEFAULT 15.0,
    is_filling boolean DEFAULT false,
    is_draining boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: terminals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.terminals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    port_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(100),
    company_name character varying(100),
    role public.user_role DEFAULT 'CLIENT'::public.user_role NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    totp_secret character varying(64),
    totp_enabled boolean DEFAULT false NOT NULL
);


--
-- Name: vessels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vessels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    imo_number character varying(20) NOT NULL,
    flag_country character varying(2) NOT NULL,
    type public.vessel_type NOT NULL,
    status public.vessel_status DEFAULT 'DOCKED'::public.vessel_status NOT NULL,
    capacity_teu integer,
    capacity_barrels double precision,
    location public.geography(Point,4326),
    heading double precision,
    speed_knots double precision,
    last_updated timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    current_route_id uuid,
    route_progress double precision DEFAULT 0.0,
    fuel_capacity double precision DEFAULT 5000.0 NOT NULL,
    fuel_level double precision DEFAULT 5000.0 NOT NULL,
    current_berth_id uuid,
    total_fuel_consumed_tons double precision DEFAULT 0 NOT NULL,
    total_distance_nm double precision DEFAULT 0 NOT NULL,
    next_survey_due date
);


--
-- Name: ocean_network id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ocean_network ALTER COLUMN id SET DEFAULT nextval('public.ocean_network_id_seq'::regclass);


--
-- Name: ocean_network_vertices_pgr id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ocean_network_vertices_pgr ALTER COLUMN id SET DEFAULT nextval('public.ocean_network_vertices_pgr_id_seq'::regclass);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: berth_allocations berth_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.berth_allocations
    ADD CONSTRAINT berth_allocations_pkey PRIMARY KEY (id);


--
-- Name: berths berths_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.berths
    ADD CONSTRAINT berths_pkey PRIMARY KEY (id);


--
-- Name: components components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.components
    ADD CONSTRAINT components_pkey PRIMARY KEY (id);


--
-- Name: crew crew_license_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crew
    ADD CONSTRAINT crew_license_number_key UNIQUE (license_number);


--
-- Name: crew crew_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crew
    ADD CONSTRAINT crew_pkey PRIMARY KEY (id);


--
-- Name: ocean_network ocean_network_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ocean_network
    ADD CONSTRAINT ocean_network_pkey PRIMARY KEY (id);


--
-- Name: ocean_network_vertices_pgr ocean_network_vertices_pgr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ocean_network_vertices_pgr
    ADD CONSTRAINT ocean_network_vertices_pgr_pkey PRIMARY KEY (id);


--
-- Name: ports ports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports
    ADD CONSTRAINT ports_pkey PRIMARY KEY (id);


--
-- Name: ports ports_un_locode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports
    ADD CONSTRAINT ports_un_locode_key UNIQUE (un_locode);


--
-- Name: routes routes_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_name_key UNIQUE (name);


--
-- Name: routes routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: shipment_events shipment_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_events
    ADD CONSTRAINT shipment_events_pkey PRIMARY KEY (id);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- Name: shipments shipments_tracking_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_tracking_number_key UNIQUE (tracking_number);


--
-- Name: tanks tanks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tanks
    ADD CONSTRAINT tanks_pkey PRIMARY KEY (id);


--
-- Name: terminals terminals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terminals
    ADD CONSTRAINT terminals_pkey PRIMARY KEY (id);


--
-- Name: components unique_component_per_vessel; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.components
    ADD CONSTRAINT unique_component_per_vessel UNIQUE (vessel_id, name);


--
-- Name: tanks unique_tank_per_vessel; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tanks
    ADD CONSTRAINT unique_tank_per_vessel UNIQUE (vessel_id, name);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vessels vessels_imo_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vessels
    ADD CONSTRAINT vessels_imo_number_key UNIQUE (imo_number);


--
-- Name: vessels vessels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vessels
    ADD CONSTRAINT vessels_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_log_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_actor ON public.audit_log USING btree (actor_id);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at DESC);


--
-- Name: idx_berth_allocations_berth_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_berth_allocations_berth_time ON public.berth_allocations USING btree (berth_id, start_time, end_time);


--
-- Name: idx_berth_allocations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_berth_allocations_status ON public.berth_allocations USING btree (status);


--
-- Name: idx_berth_allocations_vessel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_berth_allocations_vessel ON public.berth_allocations USING btree (vessel_id);


--
-- Name: idx_components_vessel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_components_vessel ON public.components USING btree (vessel_id);


--
-- Name: idx_crew_vessel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crew_vessel ON public.crew USING btree (vessel_id);


--
-- Name: idx_ocean_network_geom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ocean_network_geom ON public.ocean_network USING gist (geom);


--
-- Name: idx_ports_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ports_location ON public.ports USING gist (location);


--
-- Name: idx_ports_locode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ports_locode ON public.ports USING btree (un_locode);


--
-- Name: idx_shipment_events_shipment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipment_events_shipment ON public.shipment_events USING btree (shipment_id, created_at);


--
-- Name: idx_shipments_manifest_items; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_manifest_items ON public.shipments USING gin (manifest_items);


--
-- Name: idx_shipments_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_tracking ON public.shipments USING btree (tracking_number);


--
-- Name: idx_shipments_vessel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_vessel ON public.shipments USING btree (vessel_id);


--
-- Name: idx_tanks_vessel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tanks_vessel ON public.tanks USING btree (vessel_id);


--
-- Name: idx_vessels_imo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vessels_imo ON public.vessels USING btree (imo_number);


--
-- Name: idx_vessels_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vessels_location ON public.vessels USING gist (location);


--
-- Name: ocean_network_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ocean_network_source_idx ON public.ocean_network USING btree (source);


--
-- Name: ocean_network_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ocean_network_target_idx ON public.ocean_network USING btree (target);


--
-- Name: ocean_network_vertices_pgr_the_geom_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ocean_network_vertices_pgr_the_geom_idx ON public.ocean_network_vertices_pgr USING gist (the_geom);


--
-- Name: berth_allocations berth_allocation_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER berth_allocation_updated BEFORE UPDATE ON public.berth_allocations FOR EACH ROW EXECUTE FUNCTION public.update_berth_allocation_timestamp();


--
-- Name: audit_log audit_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: berth_allocations berth_allocations_berth_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.berth_allocations
    ADD CONSTRAINT berth_allocations_berth_id_fkey FOREIGN KEY (berth_id) REFERENCES public.berths(id) ON DELETE CASCADE;


--
-- Name: berth_allocations berth_allocations_vessel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.berth_allocations
    ADD CONSTRAINT berth_allocations_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES public.vessels(id) ON DELETE CASCADE;


--
-- Name: berths berths_current_vessel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.berths
    ADD CONSTRAINT berths_current_vessel_id_fkey FOREIGN KEY (current_vessel_id) REFERENCES public.vessels(id);


--
-- Name: berths berths_terminal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.berths
    ADD CONSTRAINT berths_terminal_id_fkey FOREIGN KEY (terminal_id) REFERENCES public.terminals(id) ON DELETE CASCADE;


--
-- Name: components components_vessel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.components
    ADD CONSTRAINT components_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES public.vessels(id) ON DELETE CASCADE;


--
-- Name: crew crew_vessel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crew
    ADD CONSTRAINT crew_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES public.vessels(id) ON DELETE SET NULL;


--
-- Name: routes routes_destination_port_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_destination_port_id_fkey FOREIGN KEY (destination_port_id) REFERENCES public.ports(id);


--
-- Name: routes routes_origin_port_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_origin_port_id_fkey FOREIGN KEY (origin_port_id) REFERENCES public.ports(id);


--
-- Name: shipment_events shipment_events_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_events
    ADD CONSTRAINT shipment_events_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;


--
-- Name: shipments shipments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id);


--
-- Name: shipments shipments_customer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_customer_user_id_fkey FOREIGN KEY (customer_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: shipments shipments_destination_port_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_destination_port_id_fkey FOREIGN KEY (destination_port_id) REFERENCES public.ports(id);


--
-- Name: shipments shipments_origin_port_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_origin_port_id_fkey FOREIGN KEY (origin_port_id) REFERENCES public.ports(id);


--
-- Name: shipments shipments_vessel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES public.vessels(id);


--
-- Name: tanks tanks_vessel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tanks
    ADD CONSTRAINT tanks_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES public.vessels(id) ON DELETE CASCADE;


--
-- Name: terminals terminals_port_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terminals
    ADD CONSTRAINT terminals_port_id_fkey FOREIGN KEY (port_id) REFERENCES public.ports(id) ON DELETE CASCADE;


--
-- Name: vessels vessels_current_berth_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vessels
    ADD CONSTRAINT vessels_current_berth_id_fkey FOREIGN KEY (current_berth_id) REFERENCES public.berths(id);


--
-- Name: vessels vessels_current_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vessels
    ADD CONSTRAINT vessels_current_route_id_fkey FOREIGN KEY (current_route_id) REFERENCES public.routes(id);


--
-- PostgreSQL database dump complete
--

