-- Solvit ERP integration: connection, mapping, catalog cache, write log.
-- Token is never stored here — only server env vars.

CREATE TABLE public.erp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  erp_company_id text NOT NULL,
  erp_company_slug text,
  enabled boolean NOT NULL DEFAULT true,
  last_ok_at timestamptz,
  last_error text,
  last_catalog_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

CREATE INDEX idx_erp_connections_company ON public.erp_connections(company_id);

ALTER TABLE public.erp_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_erp_connections" ON public.erp_connections
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.erp_entity_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('client', 'product')),
  erp_id integer NOT NULL,
  local_external_id integer NOT NULL,
  match_method text NOT NULL CHECK (match_method IN ('id', 'ext_ref', 'name', 'manual')),
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, entity_type, erp_id),
  UNIQUE (company_id, entity_type, local_external_id)
);

CREATE INDEX idx_erp_entity_map_company_type ON public.erp_entity_map(company_id, entity_type);

ALTER TABLE public.erp_entity_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_erp_entity_map" ON public.erp_entity_map
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.erp_clients (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  erp_id integer NOT NULL,
  client_name text NOT NULL,
  business_name text,
  tax_id text,
  address text,
  phone_primary text,
  email text,
  category text,
  city text,
  agent_name text,
  driver_id integer,
  driver_name text,
  collector_id integer,
  collector_name text,
  ext_ref text,
  active boolean NOT NULL DEFAULT true,
  raw jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, erp_id)
);

CREATE INDEX idx_erp_clients_name ON public.erp_clients(company_id, client_name);

ALTER TABLE public.erp_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_erp_clients" ON public.erp_clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.erp_products (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  erp_id integer NOT NULL,
  product_name text NOT NULL,
  barcode text,
  category text,
  price numeric,
  ext_ref text,
  active boolean NOT NULL DEFAULT true,
  raw jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, erp_id)
);

CREATE INDEX idx_erp_products_name ON public.erp_products(company_id, product_name);

ALTER TABLE public.erp_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_erp_products" ON public.erp_products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.erp_write_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action text NOT NULL,
  payload jsonb,
  result jsonb,
  status text NOT NULL CHECK (status IN ('success', 'error')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_erp_write_log_company ON public.erp_write_log(company_id, created_at DESC);

ALTER TABLE public.erp_write_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_erp_write_log" ON public.erp_write_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.erp_connections (company_id, erp_company_id, erp_company_slug, enabled)
VALUES ('2c64bab9-9d58-4f79-8dcb-46f698032404', '89', 'tauberd', true)
ON CONFLICT (company_id) DO NOTHING;
