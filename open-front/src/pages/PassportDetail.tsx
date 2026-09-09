import { useEffect, useState, type ReactNode } from "react"
import { useParams } from "react-router"
import { MoreHorizontal, Shirt } from "lucide-react"
import { ApiError, getPassport } from "@/services/api"
import type { Passport } from "@/types"
import { cn } from "@/lib/utils"

const TABS = ["Informations", "Composition", "Origine", "Entretien"] as const
type Tab = (typeof TABS)[number]

// Placeholder pour les champs de la maquette qui n'ont pas de colonne
// correspondante dans le schema dpp (cf. README de la branche).
const ABSENT = "—"

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="mb-7 border-b border-iter-rule pb-2.5">
      <dt className="mb-2 text-[13px] font-bold text-iter-ink">{label}</dt>
      <dd className="text-[15px] leading-relaxed text-iter-slate">
        {value === null || value === undefined || value === "" ? ABSENT : value}
      </dd>
    </div>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  const missing = value === ABSENT
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-md bg-iter-purple py-8 text-white">
      <span
        className={cn(
          "leading-none font-bold",
          missing ? "text-[22px] opacity-70" : "text-[44px]"
        )}
        title={
          missing
            ? "Aucune colonne correspondante dans le schéma dpp"
            : undefined
        }
      >
        {missing ? "n/a" : value}
      </span>
      <span className="mt-2 text-[13px]">{label}</span>
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
      <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    )
  }

  if (!passport) {
    return <p className="text-[15px] text-iter-slate">Chargement…</p>
  }

  const { product, materials, claims, recycled_content } = passport
  const manufacturing = passport.manufacturing[0]
  const transaction = passport.commercial[0]

  return (
    <article>
      <h1 className="text-[28px] leading-none font-bold text-iter-ink sm:text-[36px]">
        Produit
      </h1>
      <p className="mt-2.5 text-[17px] text-iter-slate sm:text-[21px]">
        {product.name}
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-5">
        <nav className="-mx-1 flex w-full items-center gap-5 overflow-x-auto px-1 sm:gap-7 lg:w-auto">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              className={cn(
                "-mb-px shrink-0 border-b-2 pb-2 text-[15px] transition-colors",
                tab === name
                  ? "border-iter-orange font-medium text-iter-orange"
                  : "border-transparent text-iter-ink hover:text-iter-orange"
              )}
            >
              {name}
            </button>
          ))}
          <MoreHorizontal className="size-5 text-iter-ink" />
        </nav>

        <div className="flex w-full items-center justify-between gap-5 lg:ml-auto lg:w-auto lg:justify-end">
          <button
            type="button"
            disabled
            title="Lecture seule : les données proviennent de la réplique open-dpp-db-slave."
            className="cursor-not-allowed text-[17px] text-iter-ink/75"
          >
            Modifier
          </button>
          <a
            href={`${import.meta.env.VITE_OPEN_API_URL}/api/business/passport/${product.gtin}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-iter-orange px-7 py-3 text-[17px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Générer le DPP
          </a>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="flex h-[200px] items-center justify-center rounded-md bg-iter-placeholder sm:h-[258px] lg:flex-[1.55]">
          <Shirt className="size-24 text-white/70" strokeWidth={1} />
        </div>
        <div className="flex gap-4 lg:flex-1 lg:flex-col">
          <StatCard value={ABSENT} label="Grade" />
          <StatCard value={ABSENT} label="Scan" />
        </div>
      </div>

      {tab === "Informations" && (
        <dl className="mt-10 grid grid-cols-1 gap-x-10 md:grid-cols-2 lg:gap-x-[86px]">
          <div>
            <Field label="Nom du produit" value={product.name} />
            <Field label="Référence SKU" value={product.sku} />
            <Field label="Catégorie" value={null} />
            <Field label="Genre" value={null} />
          </div>
          <div>
            <Field
              label="Description"
              value={product.descriptions.fr ?? product.descriptions.en}
            />
            <Field label="Code barres / EAN" value={product.gtin} />
          </div>
        </dl>
      )}

      {tab === "Composition" && (
        <dl className="mt-10 grid grid-cols-1 gap-x-10 md:grid-cols-2 lg:gap-x-[86px]">
          <div>
            <Field
              label="Matières"
              value={materials.map((material) => (
                <span key={material.material} className="block">
                  {material.share_percent}% {material.material}
                  {material.part && ` (${material.part})`}
                </span>
              ))}
            />
            <Field
              label="Contenu recyclé"
              value={
                recycled_content?.total_share_percent != null
                  ? `${recycled_content.total_share_percent}% — ${recycled_content.method}`
                  : null
              }
            />
          </div>
          <div>
            <Field
              label="Allégations"
              value={claims.map((claim) => (
                <span key={claim} className="block">
                  {claim}
                </span>
              ))}
            />
            <Field
              label="Substances préoccupantes"
              value={
                passport.substances_of_concern.length === 0
                  ? "Aucune déclarée"
                  : passport.substances_of_concern.map((substance) => (
                      <span key={substance.substance_name} className="block">
                        {substance.substance_name} ({substance.cas_number})
                      </span>
                    ))
              }
            />
          </div>
        </dl>
      )}

      {tab === "Origine" && (
        <dl className="mt-10 grid grid-cols-1 gap-x-10 md:grid-cols-2 lg:gap-x-[86px]">
          <div>
            <Field
              label="Fabricant"
              value={manufacturing?.manufacturer?.name}
            />
            <Field
              label="Lieu de fabrication"
              value={manufacturing?.location}
            />
            <Field
              label="Date de fabrication"
              value={manufacturing?.manufacturing_date}
            />
          </div>
          <div>
            <Field
              label="GLN fabricant"
              value={manufacturing?.manufacturer?.gln}
            />
            <Field label="Revendeur" value={transaction?.retailer?.name} />
            <Field
              label="Pays du revendeur"
              value={[
                transaction?.retailer?.locality,
                transaction?.retailer?.region,
                transaction?.retailer?.country,
              ]
                .filter(Boolean)
                .join(", ")}
            />
          </div>
        </dl>
      )}

      {tab === "Entretien" && (
        <dl className="mt-10 grid grid-cols-1 gap-x-10 md:grid-cols-2 lg:gap-x-[86px]">
          <div>
            <Field
              label="Instructions d'entretien"
              value={passport.care_instructions.map((instruction) => (
                <span key={instruction} className="block">
                  {instruction}
                </span>
              ))}
            />
            <Field
              label="Réparabilité"
              value={passport.performance?.repairability_status}
            />
          </div>
          <div>
            <Field
              label="Fin de vie"
              value={passport.sustainability?.end_of_life_preferred_route}
            />
            <Field
              label="Programme de reprise"
              value={
                passport.sustainability?.take_back_available
                  ? passport.sustainability.take_back_program
                  : "Non disponible"
              }
            />
          </div>
        </dl>
      )}
    </article>
  )
}
