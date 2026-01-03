export async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url)
  if (!response.ok) {
    return null
  }
  return response.json() as Promise<T>
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"
}
