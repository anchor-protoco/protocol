"use client"

import { CheckCircle2, Info } from "lucide-react"

interface CollateralUsageProps {
  maxLTV: number
  liquidationThreshold: number
  liquidationPenalty: number
  canBeCollateral?: boolean
}

export function CollateralUsage({
  maxLTV,
  liquidationThreshold,
  liquidationPenalty,
  canBeCollateral = true,
}: CollateralUsageProps) {
  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Collateral usage</h3>
        {canBeCollateral && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            <span>Can be collateral</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div>
          <div className="flex items-center gap-1 text-sm text-gray-400 mb-2">
            Max LTV
            <Info className="h-3.5 w-3.5" />
          </div>
          <div className="text-xl font-semibold text-white">{maxLTV}%</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-sm text-gray-400 mb-2">
            Liquidation threshold
            <Info className="h-3.5 w-3.5" />
          </div>
          <div className="text-xl font-semibold text-white">{liquidationThreshold}%</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-sm text-gray-400 mb-2">
            Liquidation penalty
            <Info className="h-3.5 w-3.5" />
          </div>
          <div className="text-xl font-semibold text-white">{liquidationPenalty}%</div>
        </div>
      </div>
    </div>
  )
}
