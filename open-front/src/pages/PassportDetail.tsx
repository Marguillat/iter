import { useEffect, useState, type ReactNode } from "react"
import { useParams } from "react-router"
import { CircleAlert, ExternalLink, MoreHorizontal } from "lucide-react"
import { ApiError, getPassport } from "@/services/api"
import type { Passport, Warranty } from "@/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Les quatre premiers onglets sont toujours visibles ; les suivants passent
// par le menu "...".
const MAIN_TABS = ["Informations", "Composition", "Origine", "Entretien"] as const
const MORE_TABS = ["Garantie", "Cycle de vie", "Passeport"] as const
type Tab = (typeof MAIN_TABS)[number] | (typeof MORE_TABS)[number]

const ABSENT = "—"

type Row = [label: string, value: ReactNode]

function isEmpty(value: ReactNode) {
  return (
    value === null ||
    value === undefined ||
    value === false ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  )
}

// Une section du passeport : carte titree contenant une table libelle / valeur.
function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {rows.map(([label, value]) => (
              <TableRow key={label}>
                <TableHead className="h-auto w-2/5 py-2 align-top whitespace-normal">
                  {label}
                </TableHead>
                <TableCell className="align-top whitespace-normal break-words text-muted-foreground">
                  {isEmpty(value) ? ABSENT : value}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function Sections({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>
}

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      variant="link"
      className="h-auto p-0 whitespace-normal"
      nativeButton={false}
      render={<a href={href} target="_blank" rel="noreferrer" />}
    >
      {children}
      <ExternalLink data-icon="inline-end" />
    </Button>
  )
}

function Lines({ items }: { items: (string | null | undefined)[] }) {
  const kept = items.filter(Boolean)
  if (kept.length === 0) return null
  return (
    <>
      {kept.map((item) => (
        <span key={item} className="block">
          {item}
        </span>
      ))}
    </>
  )
}

const warrantyVariant: Record<
  Warranty["status"],
  "default" | "secondary" | "outline"
> = {
  active: "default",
  expired: "secondary",
  void: "outline",
}

// La validite est stockee en DATERANGE et serialisee "[2025-10-12,2026-10-12)".
function formatValidity(period: string | null) {
  if (!period) return null
  const bounds = period.slice(1, -1).split(",")
  if (bounds.length !== 2) return period
  return `${bounds[0]} → ${bounds[1]}`
}

function place(parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(", ")
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-8 w-full max-w-lg" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}

export default function PassportDetail() {
  const { gtin } = useParams()
  const [passport, setPassport] = useState<Passport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("Informations")

  useEffect(() => {
    if (!gtin) return
    let cancelled = false
    setPassport(null)
    setError(null)
    getPassport(gtin)
      .then((data) => {
        if (!cancelled) setPassport(data)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        if (e instanceof ApiError && e.status === 404) {
          setError(`Aucun passeport pour le GTIN ${gtin}.`)
          return
        }
        setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [gtin])

  if (error) {
    return (
      <Alert>
        <CircleAlert />
        <AlertTitle>Passeport indisponible</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!passport) return <LoadingState />

  const { product, materials, claims, recycled_content, links } = passport
  const manufacturing = passport.manufacturing[0]
  const transaction = passport.commercial[0]
  const carrier = passport.carriers[0]
  const current = passport.lifecycle_current
  const moreActive = (MORE_TABS as readonly string[]).includes(tab)

  return (
    <article className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardDescription>{product.brand}</CardDescription>
          <CardTitle className="text-2xl font-bold sm:text-3xl">
            {product.name}
          </CardTitle>
          {current?.product_status && (
            <CardAction>
              <Badge>{current.product_status}</Badge>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">GTIN {product.gtin}</Badge>
          <Badge variant="outline">SKU {product.sku}</Badge>
          {current?.stage_name && (
            <Badge variant="secondary">{current.stage_name}</Badge>
          )}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <div className="flex items-center gap-2">
          {/* Defilement horizontal sur mobile, sans barre visible, avec un
              fondu a droite pour signaler les onglets masques. */}
          <div className="min-w-0 flex-1 overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList variant="line">
              {MAIN_TABS.map((name) => (
                <TabsTrigger key={name} value={name}>
                  {name}
                </TabsTrigger>
              ))}
              {moreActive && <TabsTrigger value={tab}>{tab}</TabsTrigger>}
            </TabsList>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Plus d'onglets" />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {MORE_TABS.map((name) => (
                <DropdownMenuItem key={name} onClick={() => setTab(name)}>
                  {name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Separator />

        <TabsContent value="Informations" className="pt-4">
          <Sections>
            <Section
              title="Produit"
              rows={[
                ["Nom du produit", product.name],
                ["Marque", product.brand],
                ["Référence SKU", product.sku],
                ["Couleur", product.color],
                ["Taille", product.size],
              ]}
            />
            <Section
              title="Identification"
              rows={[
                [
                  "Description",
                  product.descriptions.fr ?? product.descriptions.en,
                ],
                ["Code barres / EAN", product.gtin],
                ["Numéro de série", product.serial_number],
                ["Granularité", product.granularity_level],
                [
                  "Digital link",
                  product.digital_link && (
                    <Link href={product.digital_link}>Ouvrir la fiche</Link>
                  ),
                ],
                [
                  "Porteur",
                  carrier?.resolved_url && (
                    <Link href={carrier.resolved_url}>
                      {carrier.carrier_type}
                    </Link>
                  ),
                ],
              ]}
            />
          </Sections>
        </TabsContent>

        <TabsContent value="Composition" className="pt-4">
          <Sections>
            <Card>
              <CardHeader>
                <CardTitle>Matières</CardTitle>
                {recycled_content?.total_share_percent != null && (
                  <CardDescription>
                    {recycled_content.total_share_percent}% de contenu recyclé
                    — {recycled_content.method}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matière</TableHead>
                      <TableHead>Partie</TableHead>
                      <TableHead className="text-right">Part</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((m, index) => (
                      <TableRow key={index}>
                        <TableCell className="whitespace-normal">
                          {m.material}
                          {m.role && (
                            <span className="block text-muted-foreground">
                              {m.role}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{m.part ?? ABSENT}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {m.share_percent != null
                            ? `${m.share_percent}%`
                            : ABSENT}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Section
              title="Déclarations"
              rows={[
                ["Allégations", <Lines items={claims} />],
                [
                  "Substances préoccupantes",
                  passport.substances_of_concern.length === 0 ? (
                    "Aucune déclarée"
                  ) : (
                    <Lines
                      items={passport.substances_of_concern.map(
                        (s) => `${s.substance_name} (CAS ${s.cas_number})`
                      )}
                    />
                  ),
                ],
              ]}
            />
          </Sections>
        </TabsContent>

        <TabsContent value="Origine" className="pt-4">
          <Sections>
            <Section
              title="Fabrication"
              rows={[
                [
                  "Fabricant",
                  manufacturing?.manufacturer &&
                    (manufacturing.manufacturer.url ? (
                      <Link href={manufacturing.manufacturer.url}>
                        {manufacturing.manufacturer.name}
                      </Link>
                    ) : (
                      manufacturing.manufacturer.name
                    )),
                ],
                ["Lieu de fabrication", manufacturing?.location],
                ["Date de fabrication", manufacturing?.manufacturing_date],
                ["GLN fabricant", manufacturing?.manufacturer?.gln],
                [
                  "Siège du fabricant",
                  place([
                    manufacturing?.manufacturer?.locality,
                    manufacturing?.manufacturer?.region,
                    manufacturing?.manufacturer?.country,
                  ]),
                ],
              ]}
            />
            <Section
              title="Distribution"
              rows={[
                [
                  "Revendeur",
                  transaction?.retailer &&
                    (transaction.retailer.url ? (
                      <Link href={transaction.retailer.url}>
                        {transaction.retailer.name}
                      </Link>
                    ) : (
                      transaction.retailer.name
                    )),
                ],
                ["GLN revendeur", transaction?.retailer?.gln],
                [
                  "Localisation du revendeur",
                  place([
                    transaction?.retailer?.locality,
                    transaction?.retailer?.region,
                    transaction?.retailer?.country,
                  ]),
                ],
              ]}
            />
          </Sections>
        </TabsContent>

        <TabsContent value="Entretien" className="pt-4">
          <Sections>
            <Section
              title="Usage et réparation"
              rows={[
                [
                  "Instructions d'entretien",
                  <Lines items={passport.care_instructions} />,
                ],
                ["Usage prévu", passport.performance?.intended_use],
                ["Réparabilité", passport.performance?.repairability_status],
                [
                  "Notes de réparabilité",
                  passport.performance?.repairability_notes,
                ],
              ]}
            />
            <Section
              title="Fin de vie"
              rows={[
                [
                  "Consignes de recyclage",
                  passport.sustainability?.recycling_instructions.fr ??
                    passport.sustainability?.recycling_instructions.en,
                ],
                [
                  "Filières",
                  place([
                    passport.sustainability?.end_of_life_preferred_route,
                    passport.sustainability?.end_of_life_secondary_route,
                  ]),
                ],
                [
                  "Programme de reprise",
                  passport.sustainability?.take_back_available
                    ? passport.sustainability.take_back_program
                    : "Non disponible",
                ],
                [
                  "Documents",
                  (passport.care_documents.length > 0 ||
                    passport.public_documents.length > 0) && (
                    <span className="flex flex-col items-start gap-1">
                      {passport.care_documents.map((doc) => (
                        <Link key={doc.url} href={doc.url}>
                          {doc.names.fr ?? doc.names.en}
                        </Link>
                      ))}
                      {passport.public_documents.map((doc) => (
                        <Link key={doc.url} href={doc.url}>
                          {doc.doc_type}
                        </Link>
                      ))}
                    </span>
                  ),
                ],
              ]}
            />
          </Sections>
        </TabsContent>

        <TabsContent value="Garantie" className="pt-4">
          <Sections>
            <Section
              title="Achat"
              rows={[
                ["Date d'achat", transaction?.purchase_date],
                ["Montant", transaction?.purchase_amount],
                ["Revendeur", transaction?.retailer?.name],
              ]}
            />
            {transaction?.warranties.length ? (
              transaction.warranties.map((warranty, index) => (
                <Section
                  key={index}
                  title="Garantie"
                  rows={[
                    ["Type", warranty.warranty_type],
                    [
                      "Statut",
                      <Badge variant={warrantyVariant[warranty.status]}>
                        {warranty.status}
                      </Badge>,
                    ],
                    ["Validité", formatValidity(warranty.validity_period)],
                    [
                      "Durée",
                      warranty.duration_months &&
                        `${warranty.duration_months} mois`,
                    ],
                  ]}
                />
              ))
            ) : (
              <Section title="Garantie" rows={[["Statut", null]]} />
            )}
          </Sections>
        </TabsContent>

        <TabsContent value="Cycle de vie" className="pt-4">
          <Sections>
            <Section
              title="État courant"
              rows={[
                ["Étape", current?.stage_name],
                ["Date d'étape", current?.stage_date],
                [
                  "Statut produit",
                  current?.product_status && (
                    <Badge>{current.product_status}</Badge>
                  ),
                ],
                ["Date du statut", current?.status_date],
              ]}
            />
            <Card>
              <CardHeader>
                <CardTitle>Historique</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {passport.lifecycle_history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-muted-foreground">
                          {ABSENT}
                        </TableCell>
                      </TableRow>
                    ) : (
                      passport.lifecycle_history.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell className="tabular-nums">
                            {entry.status_date}
                          </TableCell>
                          <TableCell>{entry.status}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Sections>
        </TabsContent>

        <TabsContent value="Passeport" className="pt-4">
          <Sections>
            <Section
              title="Passeport"
              rows={[
                [
                  "URI",
                  <span className="font-mono text-xs break-all">
                    {passport.passport.passport_uri}
                  </span>,
                ],
                ["Type", passport.passport.passport_type],
                ["Contexte de schéma", passport.passport.schema_context],
                [
                  "Accès",
                  <span className="flex flex-wrap gap-1">
                    {passport.passport.access.public && (
                      <Badge variant="outline">public</Badge>
                    )}
                    {passport.passport.access.professional && (
                      <Badge variant="outline">professionnel</Badge>
                    )}
                    {passport.passport.access.authority && (
                      <Badge variant="outline">autorité</Badge>
                    )}
                  </span>,
                ],
                [
                  "Créé le",
                  new Date(passport.passport.created_at).toLocaleString("fr-FR"),
                ],
                [
                  "Mis à jour le",
                  new Date(passport.passport.updated_at).toLocaleString("fr-FR"),
                ],
              ]}
            />
            <Section
              title="Points d'accès"
              rows={
                links
                  ? Object.entries(links).map(([key, value]): Row => [
                      key,
                      <span className="font-mono text-xs break-all">
                        {String(value)}
                      </span>,
                    ])
                  : [["Liens", null]]
              }
            />
          </Sections>
        </TabsContent>
      </Tabs>
    </article>
  )
}
