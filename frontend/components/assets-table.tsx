"use client"

import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

interface Asset {
  id: string
  name: string
  symbol: string
  icon: string
  logoUrl : string
  totalSupplied: number
  totalSuppliedUSD: number
  supplyAPY: number
  totalBorrowed: number
  totalBorrowedUSD: number
  borrowAPY: number
}

interface AssetsTableProps {
  assets: Asset[]
}

export function AssetsTable({ assets }: AssetsTableProps) {
  console.log("asset is ", assets)
  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-zinc-800">
        <h2 className="text-xl font-semibold text-white">Testnet assets</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-400">Asset</th>
              <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-400">Total supplied</th>
              <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-400">Supply APY</th>
              <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-400">Total borrowed</th>
              <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-400 flex items-center gap-1 whitespace-nowrap">
                Borrow APY, variable
                <Info className="h-3 w-3" />
              </th>
              <th className="px-4 sm:px-6 py-3 sm:py-4"></th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 sm:px-6 py-4 sm:py-5">
                  <div className="flex items-center gap-3">
                  
                    <Avatar>
                      <AvatarImage src={asset.logoUrl}/>
                      <AvatarFallback>{asset.icon}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-white">{asset.name}</div>
                      <div className="text-sm text-gray-500">{asset.symbol}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4 sm:py-5">
                  <div className="font-medium text-white">{asset.totalSupplied}</div>
                  <div className="text-sm text-gray-500">${asset.totalSuppliedUSD.toFixed(2)}</div>
                </td>
                <td className="px-4 sm:px-6 py-4 sm:py-5">
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-sm font-medium">
                    <span>{asset.supplyAPY.toFixed(2)}%</span>
                    <div className="w-4 h-4 bg-emerald-500/20 rounded flex items-center justify-center text-xs">1×</div>
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4 sm:py-5">
                  <div className="font-medium text-white">{asset.totalBorrowed}</div>
                  <div className="text-sm text-gray-500">${asset.totalBorrowedUSD.toFixed(2)}</div>
                </td>
                <td className="px-4 sm:px-6 py-4 sm:py-5">
                  <div className="text-white font-medium">{asset.borrowAPY.toFixed(2)}%</div>
                </td>
                <td className="px-4 sm:px-6 py-4 sm:py-5">
                  <Link href={`/markets/${asset.id}`}>
                    <Button variant="ghost" className="text-gray-400 hover:text-white">
                      Details
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
