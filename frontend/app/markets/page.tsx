import { MarketsClient } from "./markets-client"

async function fetchMarketSummaries() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"
  const response = await fetch(`${baseUrl}/api/v1/markets/summary`, {
    next: { revalidate: 10 },
  })
  if (!response.ok) {
    return []
  }
  const data = await response.json()
  return Array.isArray(data.markets) ? data.markets : []
}

export default async function MarketsPage() {
  const summaries = await fetchMarketSummaries()

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <MarketsClient initialSummaries={summaries} />
      </div>
    </div>
  )
}
