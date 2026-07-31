-- ============================================================================
-- Digital Product Passport (DPP) - Schéma PostgreSQL Modernisé
-- Conforme au règlement (UE) 2024/1781 (ESPR)
-- ============================================================================

SELECT 'CREATE DATABASE db-iter-open'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = 'db-iter-open'
)\gexec

-- Create recreation USER
CREATE USER reading_user WITH PASSWORD 'reading_pass';
GRANT CONNECT ON DATABASE db-iter-open TO reading_user;

\c db-iter-open

CREATE SCHEMA IF NOT EXISTS dpp;
SET search_path TO dpp;

GRANT SELECT ON ALL TABLES IN SCHEMA dpp TO reading_user;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA dpp TO reading_user;
GRANT USAGE ON SCHEMA public TO reading_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA dpp GRANT SELECT ON TABLES TO reading_user;

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

-- ============================================================================
-- Digital Product Passport (DPP) - Seed Data
-- Patagonia Better Sweater Jacket Example
-- ============================================================================

SET search_path TO dpp;

-- Begin transaction for atomicity
BEGIN;

-- ============================================================================
-- 1. Insert Passport Record
-- ============================================================================
INSERT INTO passports (
    id,
    passport_uri,
    passport_type,
    schema_context,
    access_public,
    access_professional,
    access_authority,
    created_at,
    updated_at
) VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
    'https://verisav.fr/data/dpp-examples/patagonia-jacket#passport',
    'digital_product_passport',
    'EU DPP-inspired textile passport',
    true,
    true,
    false,
    now(),
    now()
);

-- ============================================================================
-- 2. Insert Product
-- ============================================================================
INSERT INTO products (
    id,
    passport_id,
    name,
    titles,
    descriptions,
    brand,
    sku,
    gtin,
    digital_link,
    granularity_level,
    serial_number,
    color,
    size
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::UUID,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
    'Patagonia Better Sweater Jacket',
    '{"en": "Patagonia Better Sweater Jacket - Digital Product Passport", "fr": "Veste Patagonia Better Sweater - Passeport Produit Numérique"}'::JSONB,
    '{"en": "Patagonia Better Sweater fleece jacket made from recycled polyester", "fr": "Veste en polaire Patagonia Better Sweater en polyester recyclé"}'::JSONB,
    'Patagonia',
    '25515-MEN-M',
    '884993074531',
    'https://www.patagonia.com/01/884993074531/21/PAT-2025-BSW-1234',
    'serial',
    'PAT-2025-BSW-1234',
    'Black',
    'M'
);

-- ============================================================================
-- 3. Insert Product Carrier
-- ============================================================================
INSERT INTO product_carriers (
    id,
    product_id,
    carrier_type,
    resolved_url
) VALUES (
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::UUID,
    '550e8400-e29b-41d4-a716-446655440000'::UUID,
    'uri/qr',
    'https://www.patagonia.com/01/884993074531/21/PAT-2025-BSW-1234'
);

-- ============================================================================
-- 4. Insert Economic Operators (Manufacturer & Retailer)
-- ============================================================================
-- Manufacturer
INSERT INTO economic_operators (
    id,
    name,
    role,
    url,
    gln,
    locality,
    region,
    country
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID,
    'Patagonia, Inc.',
    'manufacturer'::operator_role_enum,
    'https://www.patagonia.com',
    '8849930745310',
    'Ventura',
    'California',
    'US'
);

-- Retailer
INSERT INTO economic_operators (
    id,
    name,
    role,
    url,
    gln,
    locality,
    region,
    country
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::UUID,
    'Patagonia Store Paris',
    'retailer'::operator_role_enum,
    'https://www.patagonia.com/stores/paris',
    '3012345678902',
    'Paris',
    'Île-de-France',
    'FR'
);

-- ============================================================================
-- 5. Insert Manufacturing Record
-- ============================================================================
INSERT INTO manufacturing_records (
    id,
    passport_id,
    manufacturing_date,
    location,
    manufacturer_id
) VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
    '2025-08-20'::DATE,
    'Ventura, California, USA',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID
);

-- ============================================================================
-- 6. Insert Commercial Transaction & Warranty
-- ============================================================================
-- Commercial Transaction
INSERT INTO commercial_transactions (
    id,
    passport_id,
    retailer_id,
    purchase_date,
    purchase_amount
) VALUES (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::UUID,
    '2025-10-12'::DATE,
    '129.00'::MONEY
);

-- Warranty
INSERT INTO warranties (
    id,
    transaction_id,
    warranty_type,
    status,
    validity_period,
    duration_months
) VALUES (
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID,
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID,
    'manufacturer',
    'active'::warranty_status_enum,
    '[2025-10-12, 2026-10-12)'::DATERANGE,
    12
);

-- ============================================================================
-- 7. Insert Material Composition
-- ============================================================================
INSERT INTO material_compositions (
    id,
    passport_id,
    part,
    material,
    share_percent,
    role
) VALUES (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
    'outer',
    'recycled polyester',
    100.00,
    'fleece shell'
);

-- ============================================================================
-- 8. Insert Material Claims
-- ============================================================================
INSERT INTO material_claims (
    id,
    passport_id,
    claim_text
) VALUES (
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
    '100% recycled polyester'
);

-- ============================================================================
-- 9. Insert Substances of Concern
-- ============================================================================
-- No substances of concern for this product

-- ============================================================================
-- 10. Insert Recycled Content
-- ============================================================================
INSERT INTO recycled_content (
    id,
    passport_id,
    total_share_percent,
    method
) VALUES (
    '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
    100.00,
    'recycled polyester feedstock'
);

-- ============================================================================
-- 11. Insert Performance Record
-- ============================================================================
INSERT INTO performance_records (
    id,
    passport_id,
    intended_use,
    repairability_status,
    repairability_notes
) VALUES (
    '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
    'Everyday outerwear / fleece jacket',
    'serviceable',
    'Repairs may be supported through brand repair and resale channels'
);

-- ============================================================================
-- 12. Insert Care Instructions
-- ============================================================================
INSERT INTO care_instructions (
    id,
    passport_id,
    instruction,
    sort_order
) VALUES
    ('12eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID, 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID, 'wash cold', 1),
    ('12eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::UUID, 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID, 'do not bleach', 2),
    ('12eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::UUID, 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID, 'tumble dry low', 3),
    ('12eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'::UUID, 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID, 'do not iron', 4);

-- ============================================================================
-- 13. Insert Care Documents
-- ============================================================================
INSERT INTO care_documents (
    id,
    passport_id,
    names,
    descriptions,
    url
) VALUES (
    '13eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
    '{"en": "Care Instructions", "fr": "Instructions d''entretien"}'::JSONB,
    '{"en": "Washing and care instructions for the Better Sweater jacket", "fr": "Instructions de lavage et d''entretien pour la veste Better Sweater"}'::JSONB,
    'https://www.patagonia.com/care-instructions/better-sweater'
);

-- ============================================================================
-- 14. Insert Public Documents
-- ============================================================================
INSERT INTO public_documents (
    id,
    passport_id,
    doc_type,
    url
) VALUES
    ('14eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID, 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID, 'care', 'https://www.patagonia.com/care-instructions/better-sweater'),
    ('14eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::UUID, 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID, 'recycling', 'https://www.patagonia.com/worn-wear/');

-- ============================================================================
-- 15. Insert Sustainability Info
-- ============================================================================
INSERT INTO sustainability_info (
    id,
    passport_id,
    recycling_instructions,
    recycling_url,
    take_back_available,
    take_back_program,
    end_of_life_preferred_route,
    end_of_life_secondary_route
) VALUES (
    '15eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
    '{"en": "Product made from 100% recycled polyester. Can be recycled through Patagonia Worn Wear program or textile recycling facilities.", "fr": "Produit fabriqué à partir de 100% polyester recyclé. Peut être recyclé via le programme Patagonia Worn Wear ou les installations de recyclage textile."}'::JSONB,
    'https://www.patagonia.com/worn-wear/',
    true,
    'Patagonia Worn Wear',
    'reuse or take-back',
    'textile recycling'
);

-- ============================================================================
-- 16. Insert Lifecycle Status History
-- ============================================================================
INSERT INTO lifecycle_status_history (
    id,
    passport_id,
    status,
    status_date
) VALUES
    ('16eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID, 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID, 'manufactured', '2025-08-20'::DATE),
    ('16eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::UUID, 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID, 'sold', '2025-10-12'::DATE),
    ('16eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::UUID, 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID, 'under_warranty', '2025-10-12'::DATE);

-- ============================================================================
-- 17. Insert Lifecycle Current State
-- ============================================================================
INSERT INTO lifecycle_current_state (
    id,
    passport_id,
    stage_name,
    stage_date,
    product_status,
    status_date
) VALUES (
    '17eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
    'usage',
    '2025-10-12'::DATE,
    'sous_garantie',
    '2025-10-12'::DATE
);

-- ============================================================================
-- 18. Insert Consumer (GDPR)
-- ============================================================================
INSERT INTO consumers (
    id,
    passport_id,
    full_name,
    email
) VALUES (
    '18eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
    'Sophie Leroy',
    'sophie.leroy@example.com'
);

-- ============================================================================
-- 19. Insert Passport Links (API Endpoints)
-- ============================================================================
INSERT INTO passport_links (
    id,
    passport_id,
    endpoints
) VALUES (
    '19eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
    '{"self": "/api/dpp/patagonia-jacket", "jsonld": "/api/dpp/patagonia-jacket?format=jsonld", "ttl": "/api/dpp/patagonia-jacket?format=ttl", "public": "/api/dpp/patagonia-jacket?scope=public", "oauth": "https://api.verisav.fr/oauth/token"}'::JSONB
);

-- ============================================================================
-- Verify Data Integrity
-- ============================================================================
-- Commit transaction
COMMIT;
