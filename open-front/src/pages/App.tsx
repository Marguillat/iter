import { Button } from "@/components/ui/button"
import { getApiHealth } from "@/services/api"
import { useEffect, useState } from "react"
import { NavLink } from "react-router"

export function App() {
  const [apiAvailable, setApiAvailable] = useState(false)
  useEffect(() => {
    async function checkApiAvailable() {
      try {
        const response = await getApiHealth()
        if (response === "OK") setApiAvailable(true)
      } catch (e) {
        console.error(e)
      }
    }
    checkApiAvailable()
  }, [])

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>You may now add components and start building.</p>
          <p>We&apos;ve already added the button component for you.</p>
          <Button className="mt-2">Button</Button>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          (Press <kbd>d</kbd> to toggle dark mode)
        </div>
        <nav>
          <NavLink className="hover:underline" to="/test" end>
            Lien vers passport
          </NavLink>
        </nav>
        API : {apiAvailable ? "OK" : "KO"}
      </div>
    </div>
  )
}

export default App
