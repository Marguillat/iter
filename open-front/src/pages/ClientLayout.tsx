import { Outlet } from "react-router"
import { IterLogo } from "@/components/iter-logo"
import { Separator } from "@/components/ui/separator"

// Mise en page de la vue client (arrivee par le QR code) : pas de navigation
// metier, seulement le logo et le passeport.
export default function ClientLayout() {
  return (
    <div className="min-h-svh bg-background">
      <header className="px-5 py-3 md:px-9">
        <IterLogo className="origin-left scale-75" />
      </header>
      <Separator />
      <main className="mx-auto max-w-6xl px-5 pt-8 pb-10 md:px-9">
        <Outlet />
      </main>
    </div>
  )
}
