-- ============================================================================
-- Digital Product Passport (DPP) - Schéma PostgreSQL Modernisé
-- Conforme au règlement (UE) 2024/1781 (ESPR)
-- ============================================================================

SELECT 'CREATE DATABASE db-iter-open'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = 'db-iter-open'
)\gexec

\c db-iter-open

CREATE SCHEMA IF NOT EXISTS dpp;
SET search_path TO dpp;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'granularity_level_enum') THEN
        CREATE TYPE granularity_level_enum AS ENUM ('model', 'batch', 'serial');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'operator_role_enum') THEN
        CREATE TYPE operator_role_enum AS ENUM ('manufacturer', 'retailer', 'importer', 'authorized_representative', 'distributor');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'warranty_status_enum') THEN
        CREATE TYPE warranty_status_enum AS ENUM ('active', 'expired', 'void');
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. Table centrale du passeport
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS passports (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- gen_random_uuid() est natif depuis PG 13
    passport_uri         TEXT NOT NULL UNIQUE,
    passport_type        TEXT NOT NULL DEFAULT 'digital_product_passport',
    schema_context       TEXT,
    access_public        BOOLEAN NOT NULL DEFAULT true,
    access_professional  BOOLEAN NOT NULL DEFAULT false,
    access_authority     BOOLEAN NOT NULL DEFAULT false,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. Produit et identifiants
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id          UUID NOT NULL UNIQUE REFERENCES passports(id) ON DELETE CASCADE,
    name                 TEXT NOT NULL,
    titles               JSONB NOT NULL DEFAULT '{}'::jsonb,      -- Remplace title_en, title_fr (i18n extensible)
    descriptions         JSONB NOT NULL DEFAULT '{}'::jsonb,      -- Remplace description_en, description_fr
    brand                TEXT NOT NULL,
    sku                  TEXT NOT NULL,
    gtin                 TEXT NOT NULL,
    digital_link         TEXT,
    granularity_level    granularity_level_enum NOT NULL,         -- Utilisation de l'ENUM moderne
    serial_number        TEXT,
    color                TEXT,
    size                 TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_gtin ON products(gtin);
CREATE INDEX IF NOT EXISTS idx_products_serial_number ON products(serial_number);
CREATE INDEX IF NOT EXISTS idx_products_gtin_serial ON products(gtin, serial_number);
CREATE INDEX IF NOT EXISTS idx_products_titles_gin ON products USING gin(titles); -- Index GIN pour requêtes JSONB ultra-rapides

CREATE TABLE IF NOT EXISTS product_carriers (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id           UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    carrier_type         TEXT,
    resolved_url         TEXT
);

CREATE INDEX IF NOT EXISTS idx_product_carriers_product_id ON product_carriers(product_id);

-- ----------------------------------------------------------------------------
-- 3. Opérateurs économiques
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS economic_operators (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 TEXT NOT NULL,
    role                 operator_role_enum NOT NULL,             -- Utilisation de l'ENUM moderne
    url                  TEXT,
    gln                  TEXT,
    locality             TEXT,
    region               TEXT,
    country              TEXT
);

CREATE INDEX IF NOT EXISTS idx_economic_operators_gln ON economic_operators(gln);
CREATE INDEX IF NOT EXISTS idx_economic_operators_role ON economic_operators(role);

-- ----------------------------------------------------------------------------
-- 4. Fabrication
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manufacturing_records (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id          UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
    manufacturing_date   DATE NOT NULL,
    location             TEXT,
    manufacturer_id      UUID REFERENCES economic_operators(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_manufacturing_records_passport_id ON manufacturing_records(passport_id);

-- ----------------------------------------------------------------------------
-- 5. Données commerciales / achat / garantie
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commercial_transactions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id          UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
    retailer_id          UUID REFERENCES economic_operators(id) ON DELETE RESTRICT,
    purchase_date        DATE,
    purchase_amount      MONEY                                    -- Type MONEY moderne demandé
);

CREATE INDEX IF NOT EXISTS idx_commercial_transactions_passport_id ON commercial_transactions(passport_id);

CREATE TABLE IF NOT EXISTS warranties (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id       UUID NOT NULL REFERENCES commercial_transactions(id) ON DELETE CASCADE,
    warranty_type        TEXT,
    status               warranty_status_enum NOT NULL,           -- Utilisation de l'ENUM moderne
    validity_period      DATERANGE,                               -- Type RANGE moderne (regroupe start_date et end_date)
    duration_months      SMALLINT                                 -- Type SMALLINT optimisé pour les petits entiers
);

CREATE INDEX IF NOT EXISTS idx_warranties_transaction_id ON warranties(transaction_id);
CREATE INDEX IF NOT EXISTS idx_warranties_validity ON warranties USING gist(validity_period); -- Index GiST idéal pour les plages de données

-- ----------------------------------------------------------------------------
-- 6. Composition matières & substances préoccupantes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS material_compositions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id          UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
    part                 TEXT,
    material             TEXT NOT NULL,
    share_percent        NUMERIC(5,2) CHECK (share_percent BETWEEN 0 AND 100),
    role                 TEXT
);

CREATE INDEX IF NOT EXISTS idx_material_compositions_passport_id ON material_compositions(passport_id);

CREATE TABLE IF NOT EXISTS material_claims (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id          UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
    claim_text           TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_material_claims_passport_id ON material_claims(passport_id);

CREATE TABLE IF NOT EXISTS substances_of_concern (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id            UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
    substance_name         TEXT NOT NULL,
    cas_number             TEXT,
    concentration_percent  NUMERIC(6,4),
    location_in_product    TEXT
);

CREATE INDEX IF NOT EXISTS idx_substances_of_concern_passport_id ON substances_of_concern(passport_id);

CREATE TABLE IF NOT EXISTS recycled_content (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id            UUID NOT NULL UNIQUE REFERENCES passports(id) ON DELETE CASCADE,
    total_share_percent    NUMERIC(5,2) CHECK (total_share_percent BETWEEN 0 AND 100),
    method                 TEXT
);

-- ----------------------------------------------------------------------------
-- 7. Performance, durabilité, réparabilité
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS performance_records (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id            UUID NOT NULL UNIQUE REFERENCES passports(id) ON DELETE CASCADE,
    intended_use           TEXT,
    repairability_status   TEXT,
    repairability_notes    TEXT
);

CREATE TABLE IF NOT EXISTS care_instructions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id            UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
    instruction            TEXT NOT NULL,
    sort_order             SMALLINT
);

CREATE INDEX IF NOT EXISTS idx_care_instructions_passport_id ON care_instructions(passport_id);

-- ----------------------------------------------------------------------------
-- 8. Documentation
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS care_documents (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id            UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
    names                  JSONB NOT NULL DEFAULT '{}'::jsonb,      -- i18n via JSONB
    descriptions           JSONB NOT NULL DEFAULT '{}'::jsonb,      -- i18n via JSONB
    url                    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_care_documents_passport_id ON care_documents(passport_id);

CREATE TABLE IF NOT EXISTS public_documents (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id            UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
    doc_type               TEXT,
    url                    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_public_documents_passport_id ON public_documents(passport_id);

-- ----------------------------------------------------------------------------
-- 9. Durabilité / fin de vie
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sustainability_info (
    id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id                   UUID NOT NULL UNIQUE REFERENCES passports(id) ON DELETE CASCADE,
    recycling_instructions        JSONB NOT NULL DEFAULT '{}'::jsonb, -- i18n via JSONB
    recycling_url                 TEXT,
    take_back_available           BOOLEAN DEFAULT false,
    take_back_program             TEXT,
    end_of_life_preferred_route   TEXT,
    end_of_life_secondary_route   TEXT
);

-- ----------------------------------------------------------------------------
-- 10. Cycle de vie & statut
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lifecycle_status_history (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id            UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
    status                 TEXT NOT NULL,
    status_date            DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_status_history_passport_id ON lifecycle_status_history(passport_id);

CREATE TABLE IF NOT EXISTS lifecycle_current_state (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id            UUID NOT NULL UNIQUE REFERENCES passports(id) ON DELETE CASCADE,
    stage_name             TEXT,
    stage_date             DATE,
    product_status         TEXT,
    status_date            DATE
);

-- ----------------------------------------------------------------------------
-- 11. Consommateur (RGPD)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consumers (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id            UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
    full_name              TEXT,
    email                  TEXT
);

CREATE INDEX IF NOT EXISTS idx_consumers_passport_id ON consumers(passport_id);

-- ----------------------------------------------------------------------------
-- 12. Liens API / Endpoints
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS passport_links (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id            UUID NOT NULL UNIQUE REFERENCES passports(id) ON DELETE CASCADE,
    endpoints              JSONB NOT NULL DEFAULT '{}'::jsonb       -- Regroupe proprement self_url, jsonld_url, ttl_url, etc.
);

-- ----------------------------------------------------------------------------
-- Trigger générique : mise à jour automatique de passports.updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_passports_updated_at ON passports;
CREATE TRIGGER trg_passports_updated_at
    BEFORE UPDATE ON passports
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
