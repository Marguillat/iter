import { useState, type ReactNode } from "react"
import { NavLink, Outlet, useLocation } from "react-router"
import {
  Bell,
  Folder,
  House,
  Menu,
  Search,
  Settings,
  Tag,
  User,
  X,
} from "lucide-react"
import { IterLogo } from "@/components/iter-logo"
import { cn } from "@/lib/utils"

// Dashboard et Facturation figurent sur la maquette mais n'ont pas encore
// d'ecran : rendus inertes plutot qu'en lien mort.
function NavItem({
  icon,
  label,
  to,
  active,
  onNavigate,
}: {
  icon: ReactNode
  label: string
  to?: string
  // NavLink to="/" est exact par defaut : l'etat actif est pilote a la main
  // pour couvrir aussi les pages passeport.
  active?: boolean
  onNavigate?: () => void
}) {
  const className = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[15px] transition-colors",
      isActive
        ? "bg-iter-orange font-medium text-white"
        : "text-iter-orange hover:bg-iter-orange/10"
    )

  if (!to) {
    return (
      <span
        aria-disabled
        className={cn(className({ isActive: false }), "cursor-default")}
      >
        {icon}
        {label}
      </span>
    )
  }

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) => className({ isActive: active ?? isActive })}
    >
      {icon}
      {label}
    </NavLink>
  )
}

export default function Layout() {
  // Sous md la sidebar devient un panneau glissant.
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const { pathname } = useLocation()
  const onProducts = pathname === "/" || pathname.startsWith("/passport")

  return (
    <div className="flex min-h-svh bg-white">
      <header className="fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b border-iter-rose bg-white px-4 py-2.5 md:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Ouvrir le menu"
          className="text-iter-orange"
        >
          <Menu className="size-6" />
        </button>
        <IterLogo className="origin-left scale-75" />
      </header>

      {menuOpen && (
        <div
          onClick={closeMenu}
          aria-hidden
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[240px] shrink-0 flex-col bg-iter-rose px-5 py-7 transition-transform duration-200",
          "md:static md:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          onClick={closeMenu}
          aria-label="Fermer le menu"
          className="absolute top-4 right-4 text-iter-orange md:hidden"
        >
          <X className="size-5" />
        </button>

        <IterLogo className="mb-7 pl-2" />

        <label className="mb-8 flex items-center gap-2 rounded-full bg-white px-3.5 py-2.5">
          <Search className="size-4 shrink-0 text-iter-ink/60" />
          <input
            type="search"
            placeholder="Rechercher..."
            className="w-full bg-transparent text-sm text-iter-ink outline-none placeholder:text-iter-ink/50"
          />
        </label>

        <nav className="flex flex-col gap-1">
          <NavItem icon={<House className="size-[18px]" />} label="Dashboard" />
          <NavItem
            icon={<Folder className="size-[18px]" />}
            label="Produits"
            to="/"
            active={onProducts}
            onNavigate={closeMenu}
          />
          <NavItem icon={<Tag className="size-[18px]" />} label="Facturation" />
        </nav>

        <hr className="my-6 border-iter-ink/10" />

        <div className="flex items-center gap-4">
          <span className="flex size-11 items-center justify-center rounded-full bg-iter-orange text-white">
            <User className="size-5" />
          </span>
          <Settings className="size-5 text-iter-orange" />
          <span className="relative">
            <Bell className="size-5 text-iter-orange" />
            <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-iter-orange text-[9px] font-semibold text-white">
              9
            </span>
          </span>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-5 pt-20 pb-10 md:px-9 md:py-8">
        <Outlet />
      </main>
    </div>
  )
}
