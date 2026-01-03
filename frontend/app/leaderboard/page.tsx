"use client"

import { useState } from "react"
import { Copy, Check, Trophy, ToggleLeft, ToggleRight } from "lucide-react"

// Placeholder leaderboard data
const LEADERBOARD_DATA = [
  { rank: 1, address: "0xb497...6495", points: "10.61M" },
  { rank: 2, address: "0x5a0a...1834", points: "10.44M" },
  { rank: 3, address: "0xd125...db3d", points: "4.07M" },
  { rank: 4, address: "0x67ac...118a", points: "3.91M" },
  { rank: 5, address: "0x3847...d2d3", points: "2.72M" },
  { rank: 6, address: "0x3a48...1f2c", points: "2.51M" },
  { rank: 7, address: "0x51e1...6e5d", points: "2.40M" },
  { rank: 8, address: "0xc38b...e364", points: "1.15M" },
  { rank: 9, address: "0x9f2d...a7b1", points: "0.98M" },
  { rank: 10, address: "0x1c5e...9d4f", points: "0.87M" },
]

const USER_ADDRESS = "0x4c99...0323"
const TOTAL_POINTS = "45.41M"

export default function LeaderboardPage() {
  const [isAvailable, setIsAvailable] = useState(false)

  if (!isAvailable) {
    return (
      <>
        <ComingSoonState />
       {/*} <StateToggle isAvailable={isAvailable} onToggle={() => setIsAvailable(!isAvailable)} />*/}
      </>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-900/40 via-purple-800/30 to-purple-900/40 rounded-2xl p-8 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <h1 className="text-4xl font-bold text-white">Points Leaderboard</h1>
            </div>
          </div>

          {/* Total Points Card */}
          <div className="bg-[#141414] rounded-xl p-6 border border-white/5">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">Over all supported networks</p>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">{TOTAL_POINTS}</p>
                <p className="text-gray-400 text-sm">Total</p>
              </div>
            </div>
          </div>

          {/* User's Rank Card */}
          <div className="bg-[#141414] rounded-xl p-6 border border-white/5">
            <div className="grid grid-cols-3 gap-8 mb-6 pb-4 border-b border-white/5">
              <div>
                <p className="text-gray-400 text-sm mb-2">Your Rank</p>
                <p className="text-xl font-semibold text-white">--</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">Your Address</p>
                <AddressWithCopy address={USER_ADDRESS} />
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm mb-2">Your Points</p>
                <p className="text-xl font-semibold text-white">--</p>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div>
              <div className="grid grid-cols-3 gap-8 mb-4">
                <p className="text-gray-400 text-sm font-medium">Rank</p>
                <p className="text-gray-400 text-sm font-medium">Address</p>
                <p className="text-gray-400 text-sm font-medium text-right">Points</p>
              </div>
              <div className="space-y-4">
                {LEADERBOARD_DATA.map((entry) => (
                  <LeaderboardRow key={entry.rank} entry={entry} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/*<StateToggle isAvailable={isAvailable} onToggle={() => setIsAvailable(!isAvailable)} />*/}
    </>
  )
}
   

function LeaderboardRow({ entry }: { entry: (typeof LEADERBOARD_DATA)[0] }) {
  return (
    <div className="grid grid-cols-3 gap-8 py-3 border-t border-white/5 hover:bg-white/[0.02] transition-colors rounded-lg px-2">
      <div className="flex items-center">
        <span className="text-white font-medium">{entry.rank}</span>
      </div>
      <div className="flex items-center">
        <AddressWithCopy address={entry.address} />
      </div>
      <div className="flex items-center justify-end">
        <span className="text-white font-semibold">{entry.points}</span>
      </div>
    </div>
  )
}

function AddressWithCopy({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-white font-mono">{address}</span>
      <button
        onClick={handleCopy}
        className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  )
}

function ComingSoonState() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/40 via-purple-800/30 to-purple-900/40 rounded-2xl p-8 border border-purple-500/20 mb-8">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <h1 className="text-4xl font-bold text-white">Points Leaderboard</h1>
          </div>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-[#141414] rounded-xl border border-white/5 flex items-center justify-center min-h-[500px]">
          <div className="text-center space-y-6 max-w-md px-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full" />
              <Trophy className="h-24 w-24 text-purple-400 relative animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Leaderboard Coming Soon</h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                We're preparing something exciting. The points leaderboard will be available soon. Stay tuned!
              </p>
            </div>
            <div className="pt-4">
              <div className="inline-flex items-center gap-2 text-sm text-purple-400 bg-purple-500/10 px-4 py-2 rounded-full border border-purple-500/20">
                <div className="h-2 w-2 bg-purple-400 rounded-full animate-pulse" />
                <span>In Development</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StateToggle({ isAvailable, onToggle }: { isAvailable: boolean; onToggle: () => void }) {
  return (
    <div className="fixed bottom-8 right-8 z-50">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg shadow-lg border border-purple-500/30 transition-all hover:scale-105"
      >
        {isAvailable ? (
          <>
            <ToggleRight className="h-5 w-5" />
            <span className="text-sm font-medium">Switch to Coming Soon</span>
          </>
        ) : (
          <>
            <ToggleLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Switch to Available</span>
          </>
        )}
      </button>
    </div>
  )
}
