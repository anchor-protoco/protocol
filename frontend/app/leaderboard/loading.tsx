export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen bg-black p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Header Skeleton */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-950/50 via-purple-900/30 to-purple-950/50 border border-purple-500/20 p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-purple-800/30 rounded animate-pulse" />
            <div className="h-9 w-56 bg-purple-800/30 rounded animate-pulse" />
          </div>
        </div>

        {/* Stats Section Skeleton */}
        <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="h-5 w-48 bg-zinc-800/30 rounded animate-pulse" />
            <div className="space-y-2 text-right">
              <div className="h-8 w-24 bg-zinc-800/50 rounded animate-pulse ml-auto" />
              <div className="h-4 w-16 bg-zinc-800/30 rounded animate-pulse ml-auto" />
            </div>
          </div>

          {/* User Position Skeleton */}
          <div className="rounded-lg bg-zinc-900/50 border border-zinc-700/50 p-4 mb-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="h-4 w-20 bg-zinc-800/30 rounded mb-2 animate-pulse" />
                <div className="h-6 w-12 bg-zinc-800/50 rounded animate-pulse" />
              </div>
              <div>
                <div className="h-4 w-24 bg-zinc-800/30 rounded mb-2 animate-pulse" />
                <div className="h-5 w-32 bg-zinc-800/50 rounded animate-pulse" />
              </div>
              <div className="text-right">
                <div className="h-4 w-20 bg-zinc-800/30 rounded mb-2 animate-pulse ml-auto" />
                <div className="h-6 w-16 bg-zinc-800/50 rounded animate-pulse ml-auto" />
              </div>
            </div>
          </div>

          {/* Table Header Skeleton */}
          <div className="grid grid-cols-3 gap-4 px-4 py-3 border-b border-zinc-800/50">
            <div className="h-4 w-12 bg-zinc-800/30 rounded animate-pulse" />
            <div className="h-4 w-16 bg-zinc-800/30 rounded animate-pulse" />
            <div className="h-4 w-12 bg-zinc-800/30 rounded animate-pulse ml-auto" />
          </div>

          {/* Leaderboard Rows Skeleton */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="grid grid-cols-3 gap-4 px-4 py-4 border-b border-zinc-800/20 hover:bg-zinc-900/30">
              <div className="h-5 w-8 bg-zinc-800/50 rounded animate-pulse" />
              <div className="h-5 w-36 bg-zinc-800/50 rounded animate-pulse" />
              <div className="h-5 w-20 bg-zinc-800/50 rounded animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
