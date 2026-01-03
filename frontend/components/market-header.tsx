"use client"

import { ChevronDown } from "lucide-react"

interface MarketHeaderProps {
  data: {
    name: string
    icon: string
    totalMarketSize: number
    totalAvailable: number
    totalBorrows: number
  }
}

export function MarketHeader({ data }: MarketHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/50 via-purple-800/40 to-purple-900/30 p-5 sm:p-8 mb-8 border border-purple-500/20">
      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 text-white">
            <span className="text-2xl">{data.icon}</span>
            <h1 className="text-xl sm:text-2xl font-bold">{data.name}</h1>
          </div>
          <ChevronDown className="h-5 w-5 text-white/60" />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
          <div>
            <div className="text-sm text-purple-200/60 mb-1">Total market size</div>
            <div className="text-2xl sm:text-3xl font-bold text-white">${data.totalMarketSize.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-purple-200/60 mb-1">Total available</div>
            <div className="text-2xl sm:text-3xl font-bold text-white">${data.totalAvailable.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-purple-200/60 mb-1">Total borrows</div>
            <div className="text-2xl sm:text-3xl font-bold text-white">${data.totalBorrows.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Gradient overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 pointer-events-none" />
    </div>
  )
}
