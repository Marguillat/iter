const baseUrl: string = import.meta.env.VITE_OPEN_API_URL

async function getApiHealth() {
  try {
    const response = await fetch(`${baseUrl}/health`)
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`)
    }
    return response.text()
  } catch (e) {
    console.error(e)
  }
}

export { getApiHealth }
