"use client"

import { useMemo } from "react"
import { useWallet } from "@/app/providers"
import { useQuery } from "@tanstack/react-query"
import { fetchJson, getApiBaseUrl } from "@/lib/api"

type ActivityEvent = {
  type: string
  event: {
    contractPackageHash?: string
    amount?: string
    account?: string
    borrower?: string
    liquidator?: string
    createdAt?: string
  }
}

function shorten(hash?: string | null) {
  if (!hash) return "-"
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`
}

export function ActivityPanel({ marketPackageHash, symbol }: { marketPackageHash: string; symbol: string }) {
  const { account, status } = useWallet()
  const accountHash = account?.accountHash ?? ""
  const isConnected = status === "connected"
  const baseUrl = getApiBaseUrl()

  const { data } = useQuery({
    queryKey: ["activity", accountHash, marketPackageHash],
    queryFn: () =>
      fetchJson<{ activity?: ActivityEvent[] }>(`${baseUrl}/api/v1/activity/account/${accountHash}?limit=20`),
    enabled: isConnected && Boolean(accountHash),
  })

  const activity = useMemo(() => {
    const items = Array.isArray(data?.activity) ? data.activity : []
    return items.filter((item: ActivityEvent) => item.event?.contractPackageHash === marketPackageHash)
  }, [data, marketPackageHash])

  const rows = useMemo(() => activity.slice(0, 6), [activity])

  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 h-fit">
      <h2 className="text-xl font-semibold text-white mb-4">Recent activity</h2>
      {!isConnected ? (
        <p className="text-sm text-gray-400">Connect a wallet to view your activity.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400">No recent activity for this market.</p>
      ) : (
        <div className="space-y-3 text-sm text-gray-300">
          {rows.map((item, index) => (
            <div key={`${item.type}-${index}`} className="flex items-center justify-between">
              <div>
                <div className="text-white">{item.type}</div>
                <div className="text-xs text-gray-500">
                  {item.event?.account
                    ? shorten(item.event.account)
                    : item.event?.borrower
                      ? shorten(item.event.borrower)
                      : item.event?.liquidator
                        ? shorten(item.event.liquidator)
                        : "-"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-white">{item.event?.amount ?? "-"} {symbol}</div>
                <div className="text-xs text-gray-500">
                  {item.event?.createdAt ? new Date(item.event.createdAt).toLocaleTimeString() : "-"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
