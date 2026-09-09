package database

// LocalizedString represents a string with English and French translations
type LocalizedString struct {
	EN string `json:"en"`
	FR string `json:"fr"`
}

// Access defines visibility permissions for the passport
type Access struct {
	Public       bool `json:"public"`
	Professional bool `json:"professional"`
	Authority    bool `json:"authority"`
}

// Product holds core product identification data
type Product struct {
	Name             string          `json:"name"`
	Title            LocalizedString `json:"title"`
	Description      LocalizedString `json:"description"`
	Brand            string          `json:"brand"`
	Sku              string          `json:"sku"`
	Gtin             string          `json:"gtin"`
	DigitalLink      string          `json:"digitalLink"`
	GranularityLevel string          `json:"granularityLevel"`
	SerialNumber     string          `json:"serialNumber"`
	Color            string          `json:"color"`
	Size             string          `json:"size"`
}

// Carrier describes the physical identifier carrier (QR/URI)
type Carrier struct {
	Type        string `json:"type"`
	ResolvedUrl string `json:"resolvedUrl"`
}

// Identifiers groups all product identification codes
type Identifiers struct {
	Gtin         string  `json:"gtin"`
	Sku          string  `json:"sku"`
	SerialNumber string  `json:"serialNumber"`
	DigitalLink  string  `json:"digitalLink"`
	Carrier      Carrier `json:"carrier"`
}

// Address represents a physical location
type Address struct {
	Locality string `json:"locality"`
	Region   string `json:"region"`
	Country  string `json:"country"`
}

// Manufacturer holds manufacturer identification details
type Manufacturer struct {
	Name    string  `json:"name"`
	Url     string  `json:"url"`
	Gln     string  `json:"gln"`
	Address Address `json:"address"`
}

// Manufacturing holds manufacturing event data
type Manufacturing struct {
	Date         string       `json:"date"`
	Location     string       `json:"location"`
	Manufacturer Manufacturer `json:"manufacturer"`
}

// Retailer holds retailer identification details
type Retailer struct {
	Name string `json:"name"`
	Url  string `json:"url"`
	Gln  string `json:"gln"`
}

// Price represents a monetary amount with currency
type Price struct {
	Amount   float64 `json:"amount"`
	Currency string  `json:"currency"`
}

// Warranty describes warranty coverage
type Warranty struct {
	Type           string `json:"type"`
	Status         string `json:"status"`
	StartDate      string `json:"startDate"`
	EndDate        string `json:"endDate"`
	DurationMonths int    `json:"durationMonths"`
}

// Commercial groups purchase-related information
type Commercial struct {
	Retailer      Retailer `json:"retailer"`
	PurchaseDate  string   `json:"purchaseDate"`
	PurchasePrice Price    `json:"purchasePrice"`
	Warranty      Warranty `json:"warranty"`
}

// MaterialItem describes a single material component
type MaterialItem struct {
	Material     string  `json:"material"`
	SharePercent float64 `json:"sharePercent"`
	Role         string  `json:"role"`
}

// RecycledContent describes recycled material metadata
type RecycledContent struct {
	TotalSharePercent float64 `json:"totalSharePercent"`
	Method            string  `json:"method"`
}

// MaterialComposition groups material-related data
type MaterialComposition struct {
	Outer               []MaterialItem  `json:"outer"`
	Claims              []string        `json:"claims"`
	SubstancesOfConcern []string        `json:"substancesOfConcern"`
	RecycledContent     RecycledContent `json:"recycledContent"`
}

// Repairability describes repair support status
type Repairability struct {
	Status string `json:"status"`
	Notes  string `json:"notes"`
}

// Performance groups usage and durability information
type Performance struct {
	IntendedUse    string        `json:"intendedUse"`
	CareDurability []string      `json:"careDurability"`
	Repairability  Repairability `json:"repairability"`
}

// RecyclingInstructions describes recycling guidance
type RecyclingInstructions struct {
	EN  string `json:"en"`
	FR  string `json:"fr"`
	Url string `json:"url"`
}

// TakeBack describes take-back program availability
type TakeBack struct {
	Available bool   `json:"available"`
	Program   string `json:"program"`
}

// EndOfLife describes preferred end-of-life routes
type EndOfLife struct {
	PreferredRoute string `json:"preferredRoute"`
	SecondaryRoute string `json:"secondaryRoute"`
}

// Sustainability groups sustainability-related data
type Sustainability struct {
	RecyclingInstructions RecyclingInstructions `json:"recyclingInstructions"`
	TakeBack              TakeBack              `json:"takeBack"`
	EndOfLife             EndOfLife             `json:"endOfLife"`
}

// CareDocument describes a care instructions document
type CareDocument struct {
	Name        LocalizedString `json:"name"`
	Description LocalizedString `json:"description"`
	Url         string          `json:"url"`
}

// Care groups care documentation
type Care struct {
	Document CareDocument `json:"document"`
}

// StatusHistoryEntry represents a single lifecycle status event
type StatusHistoryEntry struct {
	Status string `json:"status"`
	Date   string `json:"date"`
}

// Lifecycle groups lifecycle stage and history data
type Lifecycle struct {
	StageName     string               `json:"stageName"`
	StageDate     string               `json:"stageDate"`
	StatusHistory []StatusHistoryEntry `json:"statusHistory"`
}

// Status describes the current product status
type Status struct {
	ProductStatus string `json:"productStatus"`
	Date          string `json:"date"`
}

// Consumer holds consumer/owner information
type Consumer struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

// PublicDocument represents a publicly accessible document reference
type PublicDocument struct {
	Type string `json:"type"`
	Url  string `json:"url"`
}

// Documentation groups public document references
type Documentation struct {
	PublicDocuments []PublicDocument `json:"publicDocuments"`
}

// Links groups related API/format links
type Links struct {
	Self   string `json:"self"`
	Jsonld string `json:"jsonld"`
	Ttl    string `json:"ttl"`
	Public string `json:"public"`
	Oauth  string `json:"oauth"`
}

// DigitalProductPassport is the top-level object englobing the entire passport
type DigitalProductPassport struct {
	PassportId          string              `json:"passportId"`
	PassportType        string              `json:"passportType"`
	SchemaContext       string              `json:"schemaContext"`
	Access              Access              `json:"access"`
	Product             Product             `json:"product"`
	Identifiers         Identifiers         `json:"identifiers"`
	Manufacturing       Manufacturing       `json:"manufacturing"`
	Commercial          Commercial          `json:"commercial"`
	MaterialComposition MaterialComposition `json:"materialComposition"`
	Performance         Performance         `json:"performance"`
	Sustainability      Sustainability      `json:"sustainability"`
	Care                Care                `json:"care"`
	Lifecycle           Lifecycle           `json:"lifecycle"`
	Status              Status              `json:"status"`
	Consumer            Consumer            `json:"consumer"`
	Documentation       Documentation       `json:"documentation"`
	Links               Links               `json:"links"`
}
