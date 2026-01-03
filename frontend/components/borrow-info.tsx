"use client"

import { Info } from "lucide-react"
import { useState } from "react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Tooltip as InfoTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface BorrowInfoProps {
  borrowAPY: number
  totalBorrowed: number
  borrowCap: number
  totalBorrowedUSD: number
  borrowCapUSD: number
}

export function BorrowInfo({ borrowAPY, totalBorrowed, borrowCap, totalBorrowedUSD, borrowCapUSD }: BorrowInfoProps) {
  const [timeframe, setTimeframe] = useState("6m")
  const percentage = (totalBorrowed / borrowCap) * 100

  const chartData = Array.from({ length: 30 }, (_, i) => ({
    date: `Day ${i + 1}`,
    apr: +(Math.random() * 3 + 2).toFixed(2),
  }))

  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Borrow Info</h2>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-40 h-40">
              {/* Circular progress */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="#27272a" strokeWidth="8" fill="none" />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="#22c55e"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - percentage / 100)}`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">&lt;0.01%</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-1 text-sm text-gray-400 mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-gray-600"></span>
                Total borrowed
                <TooltipProvider delayDuration={200}>
                  <InfoTooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total assets currently borrowed from this market.</p>
                    </TooltipContent>
                  </InfoTooltip>
                </TooltipProvider>
              </div>
              <div className="font-semibold text-white">
                {totalBorrowed.toFixed(2)} of {borrowCap.toLocaleString()}K
              </div>
              <div className="text-sm text-gray-500">
                ${totalBorrowedUSD.toFixed(2)} of ${borrowCapUSD.toLocaleString()}K
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-400 mb-1">Borrow cap</div>
              <div className="font-semibold text-white">{borrowCap.toLocaleString()}K</div>
              <div className="text-sm text-gray-500">${borrowCapUSD.toLocaleString()}K</div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1 text-sm text-gray-400 mb-2">
            <span>APY, variable</span>
            <TooltipProvider delayDuration={200}>
              <InfoTooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Current variable borrow APY for this market.</p>
                </TooltipContent>
              </InfoTooltip>
            </TooltipProvider>
          </div>
          <div className="text-2xl font-bold text-white mb-6">{borrowAPY.toFixed(2)}%</div>

          <div className="flex items-center gap-2 text-sm mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-pink-500"></div>
              <span className="text-gray-400">Borrow APR, variable</span>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            {["1w", "1m", "6m", "1y"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  timeframe === tf ? "bg-purple-500/20 text-purple-400" : "text-gray-500 hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="h-24 bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="borrowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={[0, "auto"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                    padding: "8px 12px",
                  }}
                  labelStyle={{ color: "#a1a1aa", fontSize: "12px" }}
                  itemStyle={{ color: "#ec4899", fontSize: "14px", fontWeight: "600" }}
                  formatter={(value: number) => [`${value}%`, "APR"]}
                />
                <Area
                  type="monotone"
                  dataKey="apr"
                  stroke="#ec4899"
                  strokeWidth={2}
                  fill="url(#borrowGradient)"
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
