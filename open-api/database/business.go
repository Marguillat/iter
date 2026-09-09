package database

import (
	"context"
	"fmt"
	"iter-api/utils"

	"github.com/jackc/pgx/v5"
)

// ProductSummary est la vue liste utilisee par le front metier.
// Elle joint l'etat courant du cycle de vie pour afficher un statut sans
// avoir a charger le passeport complet.
type ProductSummary struct {
	Gtin          string  `db:"gtin" json:"gtin"`
	Name          string  `db:"name" json:"name"`
	Brand         string  `db:"brand" json:"brand"`
	Sku           string  `db:"sku" json:"sku"`
	SerialNumber  *string `db:"serial_number" json:"serial_number"`
	Color         *string `db:"color" json:"color"`
	Size          *string `db:"size" json:"size"`
	StageName     *string `db:"stage_name" json:"stage_name"`
	ProductStatus *string `db:"product_status" json:"product_status"`
}

const listProductsQuery = `
SELECT p.gtin, p.name, p.brand, p.sku, p.serial_number, p.color, p.size,
       lcs.stage_name, lcs.product_status
FROM dpp.products p
LEFT JOIN dpp.lifecycle_current_state lcs ON lcs.passport_id = p.passport_id
ORDER BY p.brand, p.name`

// ListProducts renvoie tous les produits du catalogue en lecture seule.
func ListProducts(conn *pgx.Conn) ([]ProductSummary, error) {
	rows, err := conn.Query(context.Background(), listProductsQuery)
	if err != nil {
		return nil, fmt.Errorf("query failed: %w", err)
	}
	products, err := pgx.CollectRows(rows, pgx.RowToStructByName[ProductSummary])
	if err != nil {
		return nil, fmt.Errorf("collect failed: %w", err)
	}
	return products, nil
}

// La table dpp.consumers est volontairement exclue de cette projection :
// l'API ouverte n'a pas d'authentification, et le nom / email du proprietaire
// sont des donnees personnelles (RGPD).
const passportQuery = `
SELECT jsonb_build_object(
  'passport', jsonb_build_object(
      'id', pa.id,
      'passport_uri', pa.passport_uri,
      'passport_type', pa.passport_type,
      'schema_context', pa.schema_context,
      'access', jsonb_build_object(
          'public', pa.access_public,
          'professional', pa.access_professional,
          'authority', pa.access_authority),
      'created_at', pa.created_at,
      'updated_at', pa.updated_at),
  'product', to_jsonb(p) - 'passport_id',
  'carriers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
          'carrier_type', c.carrier_type, 'resolved_url', c.resolved_url))
      FROM dpp.product_carriers c WHERE c.product_id = p.id), '[]'::jsonb),
  'manufacturing', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
          'manufacturing_date', m.manufacturing_date,
          'location', m.location,
          'manufacturer', to_jsonb(eo)))
      FROM dpp.manufacturing_records m
      LEFT JOIN dpp.economic_operators eo ON eo.id = m.manufacturer_id
      WHERE m.passport_id = pa.id), '[]'::jsonb),
  'commercial', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
          'purchase_date', ct.purchase_date,
          'purchase_amount', ct.purchase_amount::text,
          'retailer', to_jsonb(eo),
          'warranties', COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                  'warranty_type', w.warranty_type,
                  'status', w.status,
                  'validity_period', w.validity_period::text,
                  'duration_months', w.duration_months))
              FROM dpp.warranties w WHERE w.transaction_id = ct.id), '[]'::jsonb)))
      FROM dpp.commercial_transactions ct
      LEFT JOIN dpp.economic_operators eo ON eo.id = ct.retailer_id
      WHERE ct.passport_id = pa.id), '[]'::jsonb),
  'materials', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
          'part', mc.part, 'material', mc.material,
          'share_percent', mc.share_percent, 'role', mc.role)
          ORDER BY mc.share_percent DESC)
      FROM dpp.material_compositions mc WHERE mc.passport_id = pa.id), '[]'::jsonb),
  'claims', COALESCE((
      SELECT jsonb_agg(cl.claim_text)
      FROM dpp.material_claims cl WHERE cl.passport_id = pa.id), '[]'::jsonb),
  'substances_of_concern', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
          'substance_name', s.substance_name, 'cas_number', s.cas_number,
          'concentration_percent', s.concentration_percent,
          'location_in_product', s.location_in_product))
      FROM dpp.substances_of_concern s WHERE s.passport_id = pa.id), '[]'::jsonb),
  'recycled_content', (
      SELECT jsonb_build_object(
          'total_share_percent', rc.total_share_percent, 'method', rc.method)
      FROM dpp.recycled_content rc WHERE rc.passport_id = pa.id),
  'performance', (
      SELECT jsonb_build_object(
          'intended_use', pr.intended_use,
          'repairability_status', pr.repairability_status,
          'repairability_notes', pr.repairability_notes)
      FROM dpp.performance_records pr WHERE pr.passport_id = pa.id),
  'care_instructions', COALESCE((
      SELECT jsonb_agg(ci.instruction ORDER BY ci.sort_order)
      FROM dpp.care_instructions ci WHERE ci.passport_id = pa.id), '[]'::jsonb),
  'care_documents', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
          'names', cd.names, 'descriptions', cd.descriptions, 'url', cd.url))
      FROM dpp.care_documents cd WHERE cd.passport_id = pa.id), '[]'::jsonb),
  'public_documents', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('doc_type', pd.doc_type, 'url', pd.url))
      FROM dpp.public_documents pd WHERE pd.passport_id = pa.id), '[]'::jsonb),
  'sustainability', (
      SELECT to_jsonb(si) - 'id' - 'passport_id'
      FROM dpp.sustainability_info si WHERE si.passport_id = pa.id),
  'lifecycle_history', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
          'status', lh.status, 'status_date', lh.status_date)
          ORDER BY lh.status_date)
      FROM dpp.lifecycle_status_history lh WHERE lh.passport_id = pa.id), '[]'::jsonb),
  'lifecycle_current', (
      SELECT jsonb_build_object(
          'stage_name', lc.stage_name, 'stage_date', lc.stage_date,
          'product_status', lc.product_status, 'status_date', lc.status_date)
      FROM dpp.lifecycle_current_state lc WHERE lc.passport_id = pa.id),
  'links', (
      SELECT pl.endpoints
      FROM dpp.passport_links pl WHERE pl.passport_id = pa.id)
)
FROM dpp.products p
JOIN dpp.passports pa ON pa.id = p.passport_id
WHERE p.gtin = $1`

// ErrPassportNotFound signale un GTIN absent du catalogue.
var ErrPassportNotFound = fmt.Errorf("passport not found")

// GetFullPassportByGTIN agrege le passeport complet cote base et renvoie le
// JSON deja serialise par PostgreSQL.
func GetFullPassportByGTIN(conn *pgx.Conn, gtin string) ([]byte, error) {
	if !utils.CheckIsGTIN(&gtin) {
		return nil, fmt.Errorf("GTIN is not in the correct format")
	}

	var passport []byte
	err := conn.QueryRow(context.Background(), passportQuery, gtin).Scan(&passport)
	if err == pgx.ErrNoRows {
		return nil, ErrPassportNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("QueryRow failed: %w", err)
	}
	return passport, nil
}
