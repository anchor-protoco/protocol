import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { MarketDetailsClient } from "./market-details-client"

async function fetchMarketSummary(asset: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://protocol-9r9q.onrender.com"
  const response = await fetch(`${baseUrl}/api/v1/markets/asset/${asset}/summary`, {
    next: { revalidate: 15 },
  })
  if (!response.ok) {
    return null
  }
  const data = await response.json()
  return data?.ok ? data : null
}

export default async function MarketDetailPage({ params }: { params: { id: string } }) {
  const summary = await fetchMarketSummary(params.id)

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <Link href="/markets">
            <Button variant="ghost" className="gap-2 text-gray-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          </Link>
        </div>

        <MarketDetailsClient assetId={params.id} initialSummary={summary} />
      </div>
    </div>
  )
}
