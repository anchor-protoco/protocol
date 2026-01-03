"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { MarketHeader } from "@/components/market-header"
import { AssetsTable } from "@/components/assets-table"
import { fetchMarketSummaries } from "@/lib/market-api"
import {
  rateToApr,
  toPlaceholderName,
  toPlaceholderSymbol,
  toTokenAmount,
  wadToNumber,
} from "@/lib/market-helpers"

type MarketsClientProps = {
  initialSummaries: unknown[]
}

export function MarketsClient({ initialSummaries }: MarketsClientProps) {
  const { data } = useQuery({
    queryKey: ["markets", "summary"],
    queryFn: fetchMarketSummaries,
    initialData: { markets: initialSummaries },
    staleTime: 15_000,
  })

  const summaries = Array.isArray(data?.markets) ? data?.markets : []

  const { assets, marketData } = useMemo(() => {
    const mapped = summaries.map((summary: any) => {
      const assetId = summary.asset ?? summary.market?.asset ?? summary.marketPackageHash ?? ""
      const metadata = summary.metadata ?? null
      const state = summary.state ?? null
      const priceWad = summary.price?.priceWad ?? null
      const priceUsd = wadToNumber(priceWad)
      const decimals = metadata?.decimals ?? 6
      const cash = toTokenAmount(state?.cash, decimals)
      const totalBorrows = toTokenAmount(state?.totalBorrows ?? state?.total_borrows, decimals)
      const totalSupplied = cash + totalBorrows
      const totalSuppliedUsd = totalSupplied * priceUsd
      const totalBorrowedUsd = totalBorrows * priceUsd
 
      return {
        id: assetId,
        name: metadata?.name ?? toPlaceholderName(assetId),
        symbol: metadata?.symbol ?? toPlaceholderSymbol(assetId),
        icon: metadata?.symbol?.slice(0, 2).toUpperCase() ?? "?",
        logoUrl : metadata?.logoUrl,
        totalSupplied,
        totalSuppliedUSD: totalSuppliedUsd,
        supplyAPY: rateToApr(state?.supplyRatePerSec ?? state?.supply_rate_per_sec),
        totalBorrowed: totalBorrows,
        totalBorrowedUSD: totalBorrowedUsd,
        borrowAPY: rateToApr(state?.borrowRatePerSec ?? state?.borrow_rate_per_sec),
      }
    })


    const totals = mapped.reduce(
      (acc, asset) => {
        acc.totalMarketSize += asset.totalSuppliedUSD
        acc.totalAvailable += asset.totalSuppliedUSD - asset.totalBorrowedUSD
        acc.totalBorrows += asset.totalBorrowedUSD
        return acc
      },
      { totalMarketSize: 0, totalAvailable: 0, totalBorrows: 0 },
    )

    return {
      assets: mapped,
      marketData: {
        name: "Anchor Market",
        icon: "[]",
        totalMarketSize: totals.totalMarketSize,
        totalAvailable: totals.totalAvailable,
        totalBorrows: totals.totalBorrows,
      },
    }
  }, [summaries])

  return (
    <>
      <MarketHeader data={marketData} />
      <AssetsTable assets={assets} />
    </>
  )
}
