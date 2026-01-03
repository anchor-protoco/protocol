export default function MarketsLoading() {
  return (
    <div className="min-h-screen bg-black p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Market Header Skeleton */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-950/50 via-purple-900/30 to-purple-950/50 border border-purple-500/20 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-8 rounded-full bg-purple-800/30 animate-pulse" />
            <div className="h-8 w-48 bg-purple-800/30 rounded animate-pulse" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-4 w-32 bg-purple-800/20 rounded mb-2 animate-pulse" />
                <div className="h-8 w-24 bg-purple-800/30 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Assets Table Skeleton */}
        <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/50 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-zinc-800/50 flex items-center justify-between">
            <div className="h-6 w-32 bg-zinc-800/50 rounded animate-pulse" />
            <div className="h-9 w-48 bg-zinc-800/50 rounded animate-pulse" />
          </div>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-zinc-800/30">
            <div className="col-span-3 h-4 bg-zinc-800/30 rounded animate-pulse" />
            <div className="col-span-2 h-4 bg-zinc-800/30 rounded animate-pulse" />
            <div className="col-span-2 h-4 bg-zinc-800/30 rounded animate-pulse" />
            <div className="col-span-2 h-4 bg-zinc-800/30 rounded animate-pulse" />
            <div className="col-span-2 h-4 bg-zinc-800/30 rounded animate-pulse" />
            <div className="col-span-1 h-4 bg-zinc-800/30 rounded animate-pulse" />
          </div>

          {/* Table Rows */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-4 px-4 md:px-6 py-4 border-b border-zinc-800/20 hover:bg-zinc-900/30"
            >
              <div className="col-span-12 md:col-span-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-zinc-800/50 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-zinc-800/50 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-zinc-800/30 rounded animate-pulse" />
                </div>
              </div>
              <div className="col-span-6 md:col-span-2 space-y-2">
                <div className="h-4 w-16 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-3 w-12 bg-zinc-800/30 rounded animate-pulse" />
              </div>
              <div className="col-span-6 md:col-span-2 space-y-2">
                <div className="h-4 w-12 bg-zinc-800/50 rounded animate-pulse" />
              </div>
              <div className="col-span-6 md:col-span-2 space-y-2">
                <div className="h-4 w-16 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-3 w-12 bg-zinc-800/30 rounded animate-pulse" />
              </div>
              <div className="col-span-6 md:col-span-2 space-y-2">
                <div className="h-4 w-12 bg-zinc-800/50 rounded animate-pulse" />
              </div>
              <div className="col-span-12 md:col-span-1 flex justify-end">
                <div className="h-9 w-20 bg-zinc-800/50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
