package database

import (
	"context"
	"fmt"
	"iter-api/utils"
	"os"
	"sync"

	"github.com/jackc/pgx/v5"
)

var lock = &sync.Mutex{}

type DBConnection struct {
	connectionString string
	CurrentConn      *pgx.Conn
}

var DB *DBConnection = nil

func ConnectToDB() (*DBConnection, error) {
	if DB == nil {
		lock.Lock()
		defer lock.Unlock()

		if DB == nil {
			fmt.Println("making new connection")
			connectionString := os.Getenv("ITER_DATABASE_URL")

			// 1. Connect using a local variable first
			conn, err := pgx.Connect(context.Background(), connectionString)
			if err != nil {
				return nil, fmt.Errorf("unable to connect to database: %w", err)
			}

			// 2. Only populate the global singleton if connection succeeds
			DB = &DBConnection{
				connectionString: connectionString,
				CurrentConn:      conn,
			}
		}
	}
	return DB, nil
}

// defer conn.Close(context.Background())

func GetProductByGTIN(conn *pgx.Conn, gtin string) ([]DigitalProductPassport, error) {
	passed := utils.CheckIsGTIN(&gtin)
	if !passed {
		return nil, fmt.Errorf("GTIN is not in the correct format")
	}

	formatedQuery := fmt.Sprintf(`WITH outer_materials AS (
    SELECT
        passport_id,
        jsonb_agg(
            jsonb_build_object(
                'material',      material,
                'sharePercent',  share_percent,
                'role',          role
            )
            ORDER BY id
        ) AS items
    FROM dpp.material_compositions
    WHERE part = 'outer' OR part IS NULL
    GROUP BY passport_id
	),
	claims_agg AS (
    SELECT
        passport_id,
        jsonb_agg(claim_text ORDER BY id) AS items
    FROM dpp.material_claims
    GROUP BY passport_id
	),
	substances_agg AS (
    SELECT
        passport_id,
        jsonb_agg(
            jsonb_build_object(
                'substanceName',        substance_name,
                'casNumber',            cas_number,
                'concentrationPercent', concentration_percent,
                'locationInProduct',    location_in_product
            )
            ORDER BY id
        ) AS items
    FROM dpp.substances_of_concern
    GROUP BY passport_id
	),
	care_agg AS (
    SELECT
        passport_id,
        jsonb_agg(instruction ORDER BY sort_order, id) AS items
    FROM dpp.care_instructions
    GROUP BY passport_id
	),
	lifecycle_history_agg AS (
    SELECT
        passport_id,
        jsonb_agg(
            jsonb_build_object(
                'status', status,
                'date',   status_date
            )
            ORDER BY status_date, id
        ) AS items
    FROM dpp.lifecycle_status_history
    GROUP BY passport_id
	),
	public_docs_agg AS (
    SELECT
        passport_id,
        jsonb_agg(
            jsonb_build_object(
                'type', doc_type,
                'url',  url
            )
            ORDER BY id
        ) AS items
    FROM dpp.public_documents
    GROUP BY passport_id
	)

	SELECT
    pp.id                                   AS passportid,
    pp.passport_type                        AS passporttype,
    pp.schema_context                       AS schemacontext,

    jsonb_build_object(
        'public',       pp.access_public,
        'professional', pp.access_professional,
        'authority',    pp.access_authority
    )                                        AS access,

    jsonb_build_object(
        'name',              pr.name,
        'title',             pr.titles,
        'description',       pr.descriptions,
        'brand',             pr.brand,
        'sku',               pr.sku,
        'gtin',              pr.gtin,
        'digitalLink',       pr.digital_link,
        'granularityLevel',  pr.granularity_level,
        'serialNumber',      pr.serial_number,
        'color',             pr.color,
        'size',              pr.size
    )                                        AS product,

    jsonb_build_object(
        'gtin',         pr.gtin,
        'sku',          pr.sku,
        'serialNumber', pr.serial_number,
        'digitalLink',  pr.digital_link,
        'carrier', jsonb_build_object(
            'type',        pc.carrier_type,
            'resolvedUrl', pc.resolved_url
        )
    )                                        AS identifiers,

    jsonb_build_object(
        'date',     mr.manufacturing_date,
        'location', mr.location,
        'manufacturer', jsonb_build_object(
            'name', mo.name,
            'url',  mo.url,
            'gln',  mo.gln,
            'address', jsonb_build_object(
                'locality', mo.locality,
                'region',   mo.region,
                'country',  mo.country
            )
        )
    )                                        AS manufacturing,

    jsonb_build_object(
        'retailer', jsonb_build_object(
            'name', ro.name,
            'url',  ro.url,
            'gln',  ro.gln
        ),
        'purchaseDate', ct.purchase_date,
        'purchasePrice', jsonb_build_object(
            'amount',   (ct.purchase_amount::numeric),
            'currency', 'EUR'
        ),
        'warranty', jsonb_build_object(
            'type',           w.warranty_type,
            'status',         w.status,
            'startDate',      lower(w.validity_period),
            'endDate',        upper(w.validity_period),
            'durationMonths', w.duration_months
        )
    )                                        AS commercial,

    jsonb_build_object(
        'outer',               COALESCE(om.items, '[]'::jsonb),
        'claims',               COALESCE(cl.items, '[]'::jsonb),
        'substancesOfConcern',  COALESCE(su.items, '[]'::jsonb),
        'recycledContent', jsonb_build_object(
            'totalSharePercent', rc.total_share_percent,
            'method',            rc.method
        )
    )                                        AS materialcomposition,

    jsonb_build_object(
        'intendedUse',    perf.intended_use,
        'careDurability', COALESCE(ca.items, '[]'::jsonb),
        'repairability', jsonb_build_object(
            'status', perf.repairability_status,
            'notes',  perf.repairability_notes
        )
    )                                        AS performance,

    jsonb_build_object(
        'recyclingInstructions', jsonb_build_object(
            'en',  si.recycling_instructions->>'en',
            'fr',  si.recycling_instructions->>'fr',
            'url', si.recycling_url
        ),
        'takeBack', jsonb_build_object(
            'available', si.take_back_available,
            'program',   si.take_back_program
        ),
        'endOfLife', jsonb_build_object(
            'preferredRoute', si.end_of_life_preferred_route,
            'secondaryRoute', si.end_of_life_secondary_route
        )
    )                                        AS sustainability,

    jsonb_build_object(
        'document', jsonb_build_object(
            'name',        cd.names,
            'description', cd.descriptions,
            'url',         cd.url
        )
    )                                        AS care,

    jsonb_build_object(
        'stageName',     lcs.stage_name,
        'stageDate',     lcs.stage_date,
        'statusHistory', COALESCE(lh.items, '[]'::jsonb)
    )                                        AS lifecycle,

    jsonb_build_object(
        'productStatus', lcs.product_status,
        'date',          lcs.status_date
    )                                        AS status,

    jsonb_build_object(
        'name',  c.full_name,
        'email', c.email
    )                                        AS consumer,

    jsonb_build_object(
        'publicDocuments', COALESCE(pd.items, '[]'::jsonb)
    )                                        AS documentation,

    pl.endpoints                             AS links

	FROM dpp.passports pp
	JOIN dpp.products pr                        ON pr.passport_id = pp.id
	LEFT JOIN dpp.product_carriers pc           ON pc.product_id = pr.id
	LEFT JOIN dpp.manufacturing_records mr      ON mr.passport_id = pp.id
	LEFT JOIN dpp.economic_operators mo         ON mo.id = mr.manufacturer_id
	LEFT JOIN dpp.commercial_transactions ct    ON ct.passport_id = pp.id
	LEFT JOIN dpp.economic_operators ro         ON ro.id = ct.retailer_id
	LEFT JOIN dpp.warranties w                  ON w.transaction_id = ct.id
	LEFT JOIN dpp.recycled_content rc           ON rc.passport_id = pp.id
	LEFT JOIN dpp.performance_records perf      ON perf.passport_id = pp.id
	LEFT JOIN dpp.care_documents cd             ON cd.passport_id = pp.id
	LEFT JOIN dpp.sustainability_info si        ON si.passport_id = pp.id
	LEFT JOIN dpp.lifecycle_current_state lcs   ON lcs.passport_id = pp.id
	LEFT JOIN dpp.consumers c                   ON c.passport_id = pp.id
	LEFT JOIN dpp.passport_links pl             ON pl.passport_id = pp.id
	LEFT JOIN outer_materials om                ON om.passport_id = pp.id
	LEFT JOIN claims_agg cl                     ON cl.passport_id = pp.id
	LEFT JOIN substances_agg su                 ON su.passport_id = pp.id
	LEFT JOIN care_agg ca                       ON ca.passport_id = pp.id
	LEFT JOIN lifecycle_history_agg lh          ON lh.passport_id = pp.id
	LEFT JOIN public_docs_agg pd                ON pd.passport_id = pp.id

	WHERE pr.gtin = '%s';`, gtin)
	rows, err := conn.Query(
		context.Background(),
		formatedQuery,
	)
	products, err := pgx.CollectRows(rows, pgx.RowToStructByName[DigitalProductPassport])
	if err != nil {
		return nil, fmt.Errorf("QueryRow failed: %v\n", err)
	}
	return products, nil
}
