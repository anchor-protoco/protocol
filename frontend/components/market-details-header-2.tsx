"use client"

import { ExternalLink, Wallet } from "lucide-react"

interface MarketDetailsHeader2Props {
  data: {
    name: string
    symbol: string
    icon: string
    reserveSize: number
    availableLiquidity: number
    utilizationRate: number
    oraclePrice: number
    supplyPoints?: number
  }
}

export function MarketDetailsHeader2({ data }: MarketDetailsHeader2Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-950/50 via-red-900/40 to-red-950/30 p-8 border border-red-500/20">
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2 text-sm text-red-200/80">
          <span className="text-lg">{data.icon}</span>
          <span>{data.symbol}</span>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-3xl font-bold text-white">{data.name}</h1>
          <button className="text-red-200/60 hover:text-red-200 transition-colors">
            <ExternalLink className="h-5 w-5" />
          </button>
        </div>

        <div className={`grid gap-8 ${data.supplyPoints !== undefined ? "grid-cols-5" : "grid-cols-4"}`}>
          <div>
            <div className="text-sm text-red-200/60 mb-1">Reserve Size</div>
            <div className="text-2xl font-bold text-white">${data.reserveSize.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-red-200/60 mb-1">Available liquidity</div>
            <div className="text-2xl font-bold text-white">${data.availableLiquidity.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-red-200/60 mb-1">Utilization Rate</div>
            <div className="text-2xl font-bold text-white">{data.utilizationRate.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-sm text-red-200/60 mb-1">Oracle price</div>
            <div className="text-2xl font-bold text-white">${data.oraclePrice.toFixed(2)}</div>
          </div>
          {data.supplyPoints !== undefined && (
            <div>
              <div className="text-sm text-red-200/60 mb-1 flex items-center gap-1">
                <Wallet className="h-4 w-4" />
                Supply Points
              </div>
              <div className="text-2xl font-bold text-white">{data.supplyPoints}</div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-rose-600/10 pointer-events-none" />
    </div>
  )
}
