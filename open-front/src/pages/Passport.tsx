import { Badge } from "@/components/ui/badge"
import { useParams } from "react-router"

export default function Passport() {
  const { passportId } = useParams()
  return (
    <main>
      <h1>Page avec le passport</h1>
      <p>
        paramètre de l'url :<Badge variant="secondary">{passportId}</Badge>
      </p>
    </main>
  )
}
