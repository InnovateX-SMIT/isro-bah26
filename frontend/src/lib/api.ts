const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface HealthResponse {
  status: string
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 seconds timeout

  try {
    const res = await fetch(`${API_URL}/health`, {
      signal: controller.signal,
      cache: "no-store",
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }
    return await res.json()
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}
