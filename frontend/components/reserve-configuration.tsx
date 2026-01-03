"use client"

import { ExternalLink } from "lucide-react"

interface ReserveConfigurationProps {
  data: {
    utilizationRate: number
  }
}

export function ReserveConfiguration({ data }: ReserveConfigurationProps) {
  const currentUtilization = data.utilizationRate
  const optimalUtilization = 80

  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Reserve status & configuration</h2>
        <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <span>INTEREST RATE STRATEGY</span>
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-2">Interest rate model</div>
        <div className="text-2xl font-bold text-white mb-4">
          Utilization Rate <span className="text-purple-400">{currentUtilization.toFixed(2)}%</span>
        </div>

        <div className="flex items-center gap-6 text-sm mb-8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-500"></div>
            <span className="text-gray-400">Borrow APR, variable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-400">Utilization Rate</span>
          </div>
        </div>

        {/* Interest Rate Curve Graph */}
        <div className="relative h-64 bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="160" x2="600" y2="160" stroke="#27272a" strokeWidth="1" />
            <line x1="0" y1="120" x2="600" y2="120" stroke="#27272a" strokeWidth="1" />
            <line x1="0" y1="80" x2="600" y2="80" stroke="#27272a" strokeWidth="1" />
            <line x1="0" y1="40" x2="600" y2="40" stroke="#27272a" strokeWidth="1" />

            {/* Borrow APR curve (pink) */}
            <path d="M 0 180 L 480 160 L 510 120 L 600 20" stroke="#ec4899" strokeWidth="2" fill="none" />

            {/* Current utilization marker (blue vertical line) */}
            <line
              x1={currentUtilization * 6}
              y1="0"
              x2={currentUtilization * 6}
              y2="200"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="4"
            />

            {/* Optimal utilization marker */}
            <line
              x1={optimalUtilization * 6}
              y1="0"
              x2={optimalUtilization * 6}
              y2="200"
              stroke="#6366f1"
              strokeWidth="1"
              strokeDasharray="4"
              opacity="0.5"
            />
          </svg>

          {/* Labels */}
          <div className="absolute bottom-2 left-6 text-xs text-gray-500">0%</div>
          <div className="absolute bottom-2 left-1/4 text-xs text-gray-500">25%</div>
          <div className="absolute bottom-2 left-1/2 text-xs text-gray-500">50%</div>
          <div className="absolute bottom-2 left-3/4 text-xs text-gray-500">75%</div>
          <div className="absolute bottom-2 right-6 text-xs text-gray-500">100%</div>

          <div className="absolute top-6 left-6 text-xs text-gray-500">90%</div>
          <div className="absolute top-1/4 left-6 text-xs text-gray-500">40%</div>
          <div className="absolute top-2/4 left-6 text-xs text-gray-500">32%</div>
          <div className="absolute top-3/4 left-6 text-xs text-gray-500">0%</div>

          {/* Current marker label */}
          <div
            className="absolute bg-zinc-800 px-2 py-1 rounded text-xs text-white"
            style={{ left: `${currentUtilization * 0.6}%`, top: "20%" }}
          >
            Current {currentUtilization.toFixed(2)}%
          </div>

          {/* Optimal marker label */}
          <div
            className="absolute bg-purple-900/50 px-2 py-1 rounded text-xs text-purple-200"
            style={{ left: `${optimalUtilization * 0.6}%`, top: "5%" }}
          >
            Optimal {optimalUtilization}%
          </div>
        </div>
      </div>
    </div>
  )
}
