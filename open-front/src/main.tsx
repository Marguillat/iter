import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router"
import "./index.css"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import Passport from "./pages/Passport"
import Layout from "./pages/Layout"
import Products from "./pages/Products"
import PassportDetail from "./pages/PassportDetail"

// Conserve le GTIN en redirigeant l'ancienne route vers la nouvelle.
function LegacyPassportRedirect() {
  const { gtin } = useParams()
  return <Navigate to={`/passport/${gtin}`} replace />
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Front metier : c'est l'ecran d'accueil. */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Products />} />
            <Route path="passport/:gtin" element={<PassportDetail />} />
          </Route>
          {/* Anciennes URL /business/* : redirigees plutot que laissees en
              page blanche (ecran noir en theme sombre). */}
          <Route path="business" element={<Navigate to="/" replace />} />
          <Route
            path="business/passport/:gtin"
            element={<LegacyPassportRedirect />}
          />
          {/* Passeport public de l'open front, inchange. */}
          <Route path=":passportId" element={<Passport />} />
          {/* Filet de securite : aucune URL ne doit rendre un ecran vide. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
)
