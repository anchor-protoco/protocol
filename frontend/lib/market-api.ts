import { fetchJson, getApiBaseUrl } from "./api"

export async function fetchMarketSummaries() {
  const baseUrl = getApiBaseUrl()
  return fetchJson<{ markets?: unknown[] }>(`${baseUrl}/api/v1/markets/summary`)
}

export async function fetchMarketSummary(asset: string) {
  const baseUrl = getApiBaseUrl()
  return fetchJson<{ ok?: boolean }>(`${baseUrl}/api/v1/markets/asset/${asset}/summary`)
}
