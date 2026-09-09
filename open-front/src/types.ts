// Types du passeport produit numerique, alignes sur la projection JSON
// renvoyee par GET /api/business/passport/:gtin (schema dpp).

export type I18nText = Record<string, string>

export type ProductSummary = {
  gtin: string
  name: string
  brand: string
  sku: string
  serial_number: string | null
  color: string | null
  size: string | null
  stage_name: string | null
  product_status: string | null
}

export type EconomicOperator = {
  id: string
  name: string
  role: string
  url: string | null
  gln: string | null
  locality: string | null
  region: string | null
  country: string | null
}

export type Warranty = {
  warranty_type: string | null
  status: "active" | "expired" | "void"
  validity_period: string | null
  duration_months: number | null
}

export type Passport = {
  passport: {
    id: string
    passport_uri: string
    passport_type: string
    schema_context: string | null
    access: { public: boolean; professional: boolean; authority: boolean }
    created_at: string
    updated_at: string
  }
  product: {
    id: string
    name: string
    titles: I18nText
    descriptions: I18nText
    brand: string
    sku: string
    gtin: string
    digital_link: string | null
    granularity_level: "model" | "batch" | "serial"
    serial_number: string | null
    color: string | null
    size: string | null
  }
  carriers: { carrier_type: string | null; resolved_url: string | null }[]
  manufacturing: {
    manufacturing_date: string
    location: string | null
    manufacturer: EconomicOperator | null
  }[]
  commercial: {
    purchase_date: string | null
    purchase_amount: string | null
    retailer: EconomicOperator | null
    warranties: Warranty[]
  }[]
  materials: {
    part: string | null
    material: string
    share_percent: number | null
    role: string | null
  }[]
  claims: string[]
  substances_of_concern: {
    substance_name: string
    cas_number: string | null
    concentration_percent: number | null
    location_in_product: string | null
  }[]
  recycled_content: { total_share_percent: number | null; method: string | null } | null
  performance: {
    intended_use: string | null
    repairability_status: string | null
    repairability_notes: string | null
  } | null
  care_instructions: string[]
  care_documents: { names: I18nText; descriptions: I18nText; url: string }[]
  public_documents: { doc_type: string | null; url: string }[]
  sustainability: {
    recycling_instructions: I18nText
    recycling_url: string | null
    take_back_available: boolean | null
    take_back_program: string | null
    end_of_life_preferred_route: string | null
    end_of_life_secondary_route: string | null
  } | null
  lifecycle_history: { status: string; status_date: string }[]
  lifecycle_current: {
    stage_name: string | null
    stage_date: string | null
    product_status: string | null
    status_date: string | null
  } | null
  links: Record<string, string> | null
}
