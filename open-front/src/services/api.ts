import type { Passport, ProductSummary } from "@/types"

const baseUrl: string = import.meta.env.VITE_OPEN_API_URL

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`)
  if (!response.ok) {
    throw new ApiError(`Response status: ${response.status}`, response.status)
  }
  return (await response.json()) as T
}

async function getApiHealth() {
  const response = await fetch(`${baseUrl}/health`)
  if (!response.ok) {
    throw new ApiError(`Response status: ${response.status}`, response.status)
  }
  return response.text()
}

// Routes metier : lectures sur la replique open-dpp-db-slave.
function listProducts() {
  return request<ProductSummary[]>("/api/business/products")
}

function getPassport(gtin: string) {
  return request<Passport>(`/api/business/passport/${gtin}`)
}

export { getApiHealth, listProducts, getPassport }
