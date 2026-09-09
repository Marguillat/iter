import { useEffect, useState } from "react"
import { NavLink } from "react-router"
import { ChevronRight } from "lucide-react"
import { listProducts } from "@/services/api"
import type { ProductSummary } from "@/types"

export default function Products() {
  const [products, setProducts] = useState<ProductSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listProducts()
      .then((data) => {
        if (!cancelled) setProducts(data)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <h1 className="text-[28px] leading-none font-bold text-iter-ink sm:text-[36px]">
        Produits
      </h1>
      <p className="mt-2.5 text-[17px] text-iter-slate sm:text-[21px]">
        Passeports produits numériques disponibles.
      </p>

      {error && (
        <p className="mt-8 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de charger le catalogue : {error}
        </p>
      )}

      {!products && !error && (
        <p className="mt-8 text-[15px] text-iter-slate">Chargement…</p>
      )}

      {products?.length === 0 && (
        <p className="mt-8 text-[15px] text-iter-slate">Aucun produit.</p>
      )}

      <ul className="mt-8 flex flex-col gap-3">
        {products?.map((product) => (
          <li key={product.gtin}>
            <NavLink
              to={`/passport/${product.gtin}`}
              className="flex items-center gap-4 rounded-md border border-iter-rule px-4 py-3.5 transition-colors hover:bg-iter-rose/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold text-iter-ink">
                    {product.name}
                  </span>
                  {product.product_status && (
                    <span className="rounded-full bg-iter-purple px-2.5 py-0.5 text-[11px] font-medium text-white">
                      {product.product_status}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[13px] text-iter-slate">
                  {product.brand} · SKU {product.sku} · GTIN {product.gtin}
                  {product.serial_number && ` · S/N ${product.serial_number}`}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-iter-orange" />
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}
