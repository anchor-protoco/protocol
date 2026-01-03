"use client"

import { ExternalLink, Wallet } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

interface MarketDetailsHeaderProps {
  data: {
    name: string
    symbol: string
    icon: string
    logoUrl : string
    reserveSize: number
    availableLiquidity: number
    utilizationRate: number
    oraclePrice: number
    supplyPoints?: number
  }
}

export function MarketDetailsHeader({ data }: MarketDetailsHeaderProps) {
  const oraclePrice = Number.isFinite(data.oraclePrice) ? data.oraclePrice : 0
  const oraclePriceLabel =
    oraclePrice > 0 && oraclePrice < 0.01
      ? oraclePrice.toFixed(6)
      : oraclePrice.toFixed(2)

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/50 via-purple-800/40 to-purple-900/30 p-5 sm:p-8 border border-purple-500/20">
      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-2 mb-2 text-sm text-purple-200/80">
      <Avatar>
                      <AvatarImage src={data.logoUrl}/>
                      <AvatarFallback>{data.icon}</AvatarFallback>
                    </Avatar>
          <span>{data.symbol}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{data.name}</h1>
          <button className="text-purple-200/60 hover:text-purple-200 transition-colors">
            <ExternalLink className="h-5 w-5" />
          </button>
        </div>

        <div
          className={`grid gap-6 sm:gap-8 ${
            data.supplyPoints !== undefined
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          }`}
        >
          <div>
            <div className="text-sm text-purple-200/60 mb-1">Reserve Size</div>
            <div className="text-xl sm:text-2xl font-bold text-white">${data.reserveSize.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-purple-200/60 mb-1">Available liquidity</div>
            <div className="text-xl sm:text-2xl font-bold text-white">${data.availableLiquidity.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-purple-200/60 mb-1">Utilization Rate</div>
            <div className="text-xl sm:text-2xl font-bold text-white">{data.utilizationRate.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-sm text-purple-200/60 mb-1">Oracle price</div>
            <div className="text-xl sm:text-2xl font-bold text-white">${oraclePriceLabel}</div>
          </div>
          {data.supplyPoints !== undefined && (
            <div>
              <div className="text-sm text-purple-200/60 mb-1 flex items-center gap-1">
                <Wallet className="h-4 w-4" />
                Supply Points
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">{data.supplyPoints}</div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 pointer-events-none" />
    </div>
  )
}
