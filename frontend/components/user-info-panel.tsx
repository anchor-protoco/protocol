"use client"

import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"
import Link from "next/link"

interface UserInfoPanelProps {
  isConnected?: boolean
  loading?: boolean
  walletBalance?: number
  availableToSupply?: number
  availableToBorrow?: number
  borrowLimit?: number
  liquidationThreshold?: number
  availableBorrow?: number
  healthFactor?: number | null
  symbol?: string
  allowance?: number
  needsApproval?: boolean
  onApprove?: () => void
  approving?: boolean
  onSupply?: () => void
  supplying?: boolean
  onBorrow?: () => void
  borrowing?: boolean
  onWithdraw?: () => void
  withdrawing?: boolean
  onRepay?: () => void
  repaying?: boolean
  txStatus?: string | null
  txHash?: string | null
  txError?: string | null
  explorerBaseUrl?: string
}

export function UserInfoPanel({
  isConnected = false,
  loading = false,
  walletBalance = 0,
  availableToSupply = 0,
  availableToBorrow = 0,
  borrowLimit = 0,
  liquidationThreshold = 0,
  availableBorrow = 0,
  healthFactor = null,
  symbol = "USDC",
  allowance = 0,
  needsApproval = false,
  onApprove,
  approving = false,
  onSupply,
  supplying = false,
  onBorrow,
  borrowing = false,
  onWithdraw,
  withdrawing = false,
  onRepay,
  repaying = false,
  txStatus = null,
  txHash = null,
  txError = null,
  explorerBaseUrl = "https://testnet.cspr.live",
}: UserInfoPanelProps) {
  if (!isConnected) {
    return (
      <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 h-fit sticky top-6">
        <h2 className="text-xl font-semibold text-white mb-6">Your info</h2>

        <div className="text-center py-12">
          <p className="text-gray-400 mb-6 leading-relaxed">
            Please connect a wallet to view your personal information here.
          </p>

          <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 rounded-lg transition-all">
            Connect wallet
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 h-fit sticky top-6">
      <h2 className="text-xl font-semibold text-white mb-6">Your info</h2>

      <div className="space-y-6">
        {txStatus ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-gray-300">
            <div className="flex items-center justify-between">
              <span className="font-medium text-white">Transaction</span>
              <span className="uppercase tracking-wide text-xs text-gray-400">{txStatus}</span>
            </div>
            {txHash ? (
              <div className="mt-2 text-xs text-gray-400">
                <a
                  href={`${explorerBaseUrl.replace(/\/$/, "")}/transaction/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-white"
                >
                  View transaction
                </a>
              </div>
            ) : null}
            {txError ? (
              <div className="mt-2 text-xs text-red-400">Error: {txError}</div>
            ) : null}
          </div>
        ) : null}
        {/* Wallet Balance */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-zinc-800/50">
            <Wallet className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex-1">
          <div className="text-sm text-gray-400 mb-1">Wallet balance</div>
          <div className="text-xl font-semibold text-white">
            {loading ? "Loading..." : `${walletBalance} ${symbol}`}
          </div>
        </div>
      </div>

        <div className="h-px bg-zinc-800" />

        {/* Available to Supply */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-400">Available to supply</div>
          </div>
          <div className="text-xl font-semibold text-white mb-3">
            {loading ? "Loading..." : `${availableToSupply} ${symbol}`}
          </div>
          <div className="text-sm text-gray-500 mb-3">
            {loading ? "Loading..." : `$ ${availableToSupply}`}
          </div>
          <div className="text-xs text-gray-500 mb-3">
            {loading ? "Allowance: Loading..." : `Allowance: ${allowance} ${symbol}`}
          </div>
          <Button
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2.5 rounded-lg transition-all"
            disabled={loading || (needsApproval ? approving : supplying)}
            onClick={needsApproval ? onApprove : onSupply}
          >
            {loading
              ? "Loading..."
              : needsApproval
                ? approving
                  ? "Approving..."
                  : "Approve to supply"
                : supplying
                  ? "Supplying..."
                  : "Supply"}
          </Button>
          <Button
            className="w-full mt-3 bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-2.5 rounded-lg transition-all border border-zinc-800"
            disabled={loading || withdrawing}
            onClick={onWithdraw}
          >
            {loading ? "Loading..." : withdrawing ? "Withdrawing..." : "Withdraw"}
          </Button>
        </div>

        <div className="h-px bg-zinc-800" />

        {/* Available to Borrow */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-400">Available to borrow</div>
          </div>
          <div className="text-xl font-semibold text-white mb-3">
            {loading ? "Loading..." : `${availableToBorrow} ${symbol}`}
          </div>
          <div className="text-sm text-gray-500 mb-3">
            {loading ? "Loading..." : ` ${availableToBorrow}`}
          </div>
          <div className="space-y-1 text-xs text-gray-500 mb-4">
            <div>
              {loading ? "Borrow limit: Loading..." : `Borrow limit: ${borrowLimit} ${symbol}`}
            </div>
            <div>
              {loading
                ? "Available borrow: Loading..."
                : `Available borrow: ${availableBorrow} ${symbol}`}
            </div>
            <div>
              {loading
                ? "Liquidation threshold: Loading..."
                : `Liquidation threshold: ${liquidationThreshold} ${symbol}`}
            </div>
            <div>
              {loading
                ? "Health factor: Loading..."
                : `Health factor: ${healthFactor ? healthFactor.toFixed(2) : "N/A"}`}
            </div>
          </div>
          <Button
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2.5 rounded-lg transition-all"
            disabled={loading || borrowing}
            onClick={onBorrow}
          >
            {loading ? "Loading..." : borrowing ? "Borrowing..." : "Borrow"}
          </Button>
          <Button
            className="w-full mt-3 bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-2.5 rounded-lg transition-all border border-zinc-800"
            disabled={loading || repaying}
            onClick={onRepay}
          >
            {loading ? "Loading..." : repaying ? "Repaying..." : "Repay"}
          </Button>
        </div>

        {/* Bridge Message */}
        <div className="p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
          <p className="text-sm text-cyan-400 leading-relaxed">
            Your Polygon POS wallet is empty. Purchase or transfer assets or use{" "}
            <Link href="#" className="underline hover:text-cyan-300 transition-colors">
              Polygon PoS Bridge
            </Link>{" "}
            to transfer your Ethereum assets.
          </p>
        </div>
      </div>
    </div>
  )
}
