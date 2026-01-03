"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { MarketDetailsHeader } from "@/components/market-details-header"
import { ReserveConfiguration } from "@/components/reserve-configuration"
import { SupplyInfo } from "@/components/supply-info"
import { CollateralUsage } from "@/components/collateral-usage"
import { BorrowInfo } from "@/components/borrow-info"
import { MarketUserPanel } from "./user-panel"
import { ActivityPanel } from "./activity-panel"
import { fetchMarketSummary } from "@/lib/market-api"
import {
  rateToApr,
  toPlaceholderName,
  toPlaceholderSymbol,
  toTokenAmount,
  wadToNumber,
} from "@/lib/market-helpers"

type MarketDetailsClientProps = {
  assetId: string
  initialSummary: any
}

export function MarketDetailsClient({ assetId, initialSummary }: MarketDetailsClientProps) {
  const { data } = useQuery({
    queryKey: ["markets", "summary", assetId],
    queryFn: () => fetchMarketSummary(assetId),
    initialData: initialSummary,
    staleTime: 15_000,
  })

  const summary = data?.ok ? data : initialSummary
  const metadata = summary?.metadata ?? null
  const state = summary?.state ?? null
  const priceWad = summary?.price?.priceWad ?? null
  const priceUsd = wadToNumber(priceWad)
  const decimals = metadata?.decimals ?? 6

  const cash = toTokenAmount(state?.cash, decimals)
  const totalBorrows = toTokenAmount(state?.totalBorrows ?? state?.total_borrows, decimals)
  const totalSupplied = cash + totalBorrows
  const totalSuppliedUsd = totalSupplied * priceUsd
  const totalBorrowedUsd = totalBorrows * priceUsd

  const supplyCap = toTokenAmount(summary?.riskParams?.supplyCap, decimals)
  const borrowCap = toTokenAmount(summary?.riskParams?.borrowCap, decimals)
  const maxSupply = supplyCap > 0 ? supplyCap : Math.max(totalSupplied, 1)
  const maxBorrow = borrowCap > 0 ? borrowCap : Math.max(totalBorrows, 1)

  const marketDetails = useMemo(
    () => ({
      id: summary?.asset ?? assetId,
      name: metadata?.name ?? toPlaceholderName(assetId),
      symbol: metadata?.symbol ?? toPlaceholderSymbol(assetId),
      icon: metadata?.symbol?.slice(0, 2).toUpperCase() ?? "?",
      logoUrl : metadata?.logoUrl,
      reserveSize: totalSuppliedUsd,
      availableLiquidity: cash * priceUsd,
      utilizationRate: wadToNumber(state?.utilization) * 100,
      oraclePrice: priceUsd,
      supplyAPY: rateToApr(state?.supplyRatePerSec ?? state?.supply_rate_per_sec),
      borrowAPY: rateToApr(state?.borrowRatePerSec ?? state?.borrow_rate_per_sec),
      totalSupplied,
      maxSupply,
      totalSuppliedUSD: totalSuppliedUsd,
      maxSupplyUSD: maxSupply * priceUsd,
      supplyPoints: 0,
      totalBorrowed: totalBorrows,
      borrowCap: maxBorrow,
      totalBorrowedUSD: totalBorrowedUsd,
      borrowCapUSD: maxBorrow * priceUsd,
    }),
    [
      assetId,
      summary?.asset,
      metadata,
      totalSuppliedUsd,
      cash,
      priceUsd,
      state,
      totalSupplied,
      maxSupply,
      totalBorrows,
      maxBorrow,
      totalBorrowedUsd,
    ],
  )

  const collateralData = {
    maxLTV: wadToNumber(summary?.riskParams?.collateralFactor) * 100,
    liquidationThreshold: wadToNumber(summary?.riskParams?.liquidationThreshold) * 100,
    liquidationPenalty: wadToNumber(summary?.riskParams?.liquidationBonus) * 100,
    canBeCollateral: wadToNumber(summary?.riskParams?.collateralFactor) > 0,
  }

  return (
    <>
      <MarketDetailsHeader data={marketDetails} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ReserveConfiguration data={marketDetails} />
          <SupplyInfo data={marketDetails} />
          <CollateralUsage {...collateralData} />
          <BorrowInfo
            borrowAPY={marketDetails.borrowAPY}
            totalBorrowed={marketDetails.totalBorrowed}
            borrowCap={marketDetails.borrowCap}
            totalBorrowedUSD={marketDetails.totalBorrowedUSD}
            borrowCapUSD={marketDetails.borrowCapUSD}
          />
        </div>

        <div className="lg:col-span-1 space-y-6">
          <MarketUserPanel
            asset={marketDetails.id}
            marketPackageHash={summary?.marketPackageHash ?? ""}
            decimals={decimals}
            symbol={marketDetails.symbol}
            supplyAPY={marketDetails.supplyAPY}
            borrowAPY={marketDetails.borrowAPY}
          />
        </div>
      </div>
    </>
  )
}
