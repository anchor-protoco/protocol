export default function MarketDetailsLoading() {
  return (
    <div className="min-h-screen bg-black">
      <div className="p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-[1400px]">
          {/* Header Skeleton */}
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-purple-950/50 via-purple-900/30 to-purple-950/50 border border-purple-500/20 p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-6 w-24 bg-purple-800/30 rounded animate-pulse" />
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-full bg-purple-800/30 animate-pulse" />
              <div className="h-8 w-32 bg-purple-800/30 rounded animate-pulse" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i}>
                  <div className="h-3 w-20 bg-purple-800/20 rounded mb-2 animate-pulse" />
                  <div className="h-6 w-16 bg-purple-800/30 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_380px] gap-6">
            {/* Main Content */}
            <div className="space-y-6">
              {/* Reserve Configuration Skeleton */}
              <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/50 p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-6 w-64 bg-zinc-800/50 rounded animate-pulse" />
                  <div className="h-5 w-40 bg-zinc-800/30 rounded animate-pulse" />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div className="h-4 w-32 bg-zinc-800/30 rounded animate-pulse" />
                    <div className="h-5 w-20 bg-zinc-800/50 rounded animate-pulse" />
                  </div>

                  <div className="h-64 bg-zinc-900/50 rounded-lg animate-pulse" />
                </div>
              </div>

              {/* Supply Info Skeleton */}
              <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/50 p-4 md:p-6">
                <div className="h-6 w-24 bg-zinc-800/50 rounded mb-6 animate-pulse" />

                <div className="flex items-center gap-6 mb-6">
                  <div className="relative h-32 w-32">
                    <div className="h-full w-full rounded-full bg-zinc-800/30 animate-pulse" />
                  </div>

                  <div className="space-y-4 flex-1">
                    <div>
                      <div className="h-3 w-24 bg-zinc-800/30 rounded mb-2 animate-pulse" />
                      <div className="h-6 w-32 bg-zinc-800/50 rounded animate-pulse" />
                    </div>
                    <div>
                      <div className="h-3 w-16 bg-zinc-800/30 rounded mb-2 animate-pulse" />
                      <div className="h-5 w-24 bg-zinc-800/50 rounded animate-pulse" />
                    </div>
                  </div>
                </div>

                <div className="h-48 bg-zinc-900/50 rounded-lg animate-pulse" />
              </div>

              {/* Collateral Usage Skeleton */}
              <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/50 p-4 md:p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-6 w-40 bg-zinc-800/50 rounded animate-pulse" />
                  <div className="h-5 w-32 bg-emerald-800/30 rounded animate-pulse" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg bg-zinc-900/50 p-4">
                      <div className="h-4 w-20 bg-zinc-800/30 rounded mb-2 animate-pulse" />
                      <div className="h-6 w-16 bg-zinc-800/50 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Skeleton */}
            <div className="lg:sticky lg:top-8 h-fit">
              <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/50 p-6">
                <div className="h-6 w-24 bg-zinc-800/50 rounded mb-6 animate-pulse" />

                <div className="space-y-6">
                  <div>
                    <div className="h-4 w-28 bg-zinc-800/30 rounded mb-3 animate-pulse" />
                    <div className="h-8 w-32 bg-zinc-800/50 rounded animate-pulse" />
                  </div>

                  <div>
                    <div className="h-4 w-32 bg-zinc-800/30 rounded mb-3 animate-pulse" />
                    <div className="h-10 w-full bg-emerald-900/20 rounded-lg animate-pulse" />
                  </div>

                  <div>
                    <div className="h-4 w-32 bg-zinc-800/30 rounded mb-3 animate-pulse" />
                    <div className="h-10 w-full bg-pink-900/20 rounded-lg animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
