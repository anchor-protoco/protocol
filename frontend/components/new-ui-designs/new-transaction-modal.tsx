"use client"

import { useState } from "react"
import { X, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  type: "supply" | "withdraw" | "borrow" | "repay"
  symbol: string
  balance?: number
  maxAmount?: number
  apy?: number
  busy?: boolean
  onSubmit: (amount: string) => void
  txStatus?: "idle" | "pending" | "success" | "failed"
  txHash?: string | null
  txError?: string | null
  explorerBaseUrl?: string
}

export function TransactionModal({
  isOpen,
  onClose,
  type,
  symbol,
  balance = 0,
  maxAmount = 0,
  apy = 0,
  busy = false,
  onSubmit,
  txStatus = "idle",
  txHash = null,
  txError = null,
  explorerBaseUrl = "https://testnet.cspr.live",
}: TransactionModalProps) {
  const [amount, setAmount] = useState("")

  if (!isOpen) return null

  const titles = {
    supply: "Supply",
    withdraw: "Withdraw",
    borrow: "Borrow",
    repay: "Repay",
  }

  const descriptions = {
    supply: "How much would you like to supply?",
    withdraw: "How much would you like to withdraw?",
    borrow: "How much would you like to borrow?",
    repay: "How much would you like to repay?",
  }

  const buttonColors = {
    supply: "bg-emerald-500 hover:bg-emerald-600",
    withdraw: "bg-orange-500 hover:bg-orange-600",
    borrow: "bg-pink-500 hover:bg-pink-600",
    repay: "bg-blue-500 hover:bg-blue-600",
  }

  const handleMaxClick = () => {
    setAmount(maxAmount.toString())
  }

  const handleSubmit = () => {
    onSubmit(amount)
    setAmount("")
  }

  const numericAmount = Number.parseFloat(amount || "0")
  const isInvalid =
    !amount || Number.isNaN(numericAmount) || numericAmount <= 0 || numericAmount > maxAmount

  const isPending = txStatus === "pending"
  const isTerminal = txStatus === "success" || txStatus === "failed"
  const explorerUrl = txHash
    ? `${explorerBaseUrl.replace(/\/$/, "")}/transaction/${txHash}`
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={isPending ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-2xl font-semibold text-white">{titles[type]}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-60"
            disabled={isPending}
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-gray-400">{descriptions[type]}</p>

          {/* Amount Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Amount</span>
              <button
                onClick={handleMaxClick}
                className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                Max: {maxAmount} {symbol}
              </button>
            </div>

            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-4 text-2xl font-semibold text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{symbol}</div>
            </div>

            <div className="text-sm text-gray-500">≈ ${amount || "0.00"} USD</div>
          </div>

          {/* Info Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/30 border border-zinc-800">
              <span className="text-sm text-gray-400">
                {type === "supply" || type === "withdraw" ? "Supply APY" : "Borrow APY"}
              </span>
              <span className="text-sm font-semibold text-white">{apy}%</span>
            </div>

            {(type === "supply" || type === "borrow") && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                <Info className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-cyan-400 leading-relaxed">
                  {type === "supply"
                    ? "You will earn interest on your supplied assets. You can withdraw at any time."
                    : "You will be charged interest on your borrowed assets. Make sure to maintain healthy collateral."}
                </p>
              </div>
            )}
          </div>

          {/* Transaction Overview */}
          <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800 space-y-2">
            <div className="text-sm font-medium text-gray-300 mb-3">Transaction Overview</div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Current balance</span>
              <span className="text-white font-medium">
                {balance} {symbol}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">New balance</span>
              <span className="text-white font-medium">
                {type === "supply" || type === "repay"
                  ? (balance - Number.parseFloat(amount || "0")).toFixed(2)
                  : (balance + Number.parseFloat(amount || "0")).toFixed(2)}{" "}
                {symbol}
              </span>
            </div>
          </div>

          {txStatus !== "idle" && (
            <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800 space-y-2">
              <div className="text-sm font-medium text-gray-300">Transaction status</div>
              <div className="text-sm text-gray-400">
                {txStatus === "pending" && "Submitting transaction..."}
                {txStatus === "success" && "Transaction confirmed."}
                {txStatus === "failed" && "Transaction failed."}
              </div>
              {txError ? <div className="text-xs text-red-400">Error: {txError}</div> : null}
              {explorerUrl ? (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-400 underline hover:text-cyan-300"
                >
                  View on explorer
                </a>
              ) : null}
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleSubmit}
            disabled={isInvalid || busy || isPending}
            className={`w-full ${buttonColors[type]} text-white font-semibold py-6 text-lg rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isPending
              ? "Pending..."
              : busy
              ? "Processing..."
              : `${titles[type]} ${!isInvalid ? `${amount} ${symbol}` : ""}`.trim()}
          </Button>
        </div>
      </div>
    </div>
  )
}
