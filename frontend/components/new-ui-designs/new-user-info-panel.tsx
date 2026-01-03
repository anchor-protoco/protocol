"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"
import { TransactionModal } from "./new-transaction-modal"
import { openExternalUrl } from "@/lib/utils"
import { useWallet } from "@/app/providers"


interface UserInfoPanelProps {
  isConnected?: boolean
  loading?: boolean
  walletBalance?: number
  availableToSupply?: number
  availableToBorrow?: number
  symbol?: string
  supplyAPY?: number
  borrowAPY?: number
  currentSupplied?: number
  currentBorrowed?: number
  needsApproval?: boolean
  onApprove?: () => void
  approving?: boolean
  onSupply?: (amount: string) => void
  onWithdraw?: (amount: string) => void
  onBorrow?: (amount: string) => void
  onRepay?: (amount: string) => void
  supplying?: boolean
  withdrawing?: boolean
  borrowing?: boolean
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
  symbol = "USDC",
  supplyAPY = 0.4,
  borrowAPY = 2.92,
  currentSupplied = 0,
  currentBorrowed = 0,
  needsApproval = false,
  onApprove,
  approving = false,
  onSupply,
  onWithdraw,
  onBorrow,
  onRepay,
  supplying = false,
  withdrawing = false,
  borrowing = false,
  repaying = false,
  txStatus = null,
  txHash = null,
  txError = null,
  explorerBaseUrl = "https://testnet.cspr.live",
}: UserInfoPanelProps) {
  const { connect, status, isReady } = useWallet()
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: "supply" | "withdraw" | "borrow" | "repay"
  }>({
    isOpen: false,
    type: "supply",
  })
 

  const openModal = (type: "supply" | "withdraw" | "borrow" | "repay") => {
    setModalState({ isOpen: true, type })
  }

  const closeModal = () => {
    setModalState((current) => ({ ...current, isOpen: false }))
  }

  const txStatusForModal = useMemo(() => {
    if (!modalState.isOpen) return "idle"
    return txStatus ?? "idle"
  }, [modalState.isOpen, txStatus])
  const isConnecting = !isReady || status === "connecting"

  if (!isConnected) {
    return (
      <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 h-fit sticky top-6">
        <h2 className="text-xl font-semibold text-white mb-6">Your info</h2>

        <div className="text-center py-12">
          <p className="text-gray-400 mb-6 leading-relaxed">
            Please connect a wallet to view your personal information here.
          </p>

          <Button
            onClick={connect}
            size={"lg"}
            disabled={isConnecting}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 rounded-lg transition-all disabled:opacity-70"
          >
            {isConnecting ? "Connecting..." : "Connect wallet"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 h-fit sticky top-6">
        <h2 className="text-xl font-semibold text-white mb-6">Your info</h2>

        <div className="space-y-6">
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

          {currentSupplied > 0 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-400">Your supply</div>
                  <div className="text-xs text-emerald-400 font-medium">{supplyAPY}% APY</div>
                </div>
                <div className="text-xl font-semibold text-white mb-3">
                  {loading ? "Loading..." : `${currentSupplied} ${symbol}`}
                </div>
                <div className="text-sm text-gray-500 mb-3"> {currentSupplied}</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => (needsApproval ? onApprove?.() : openModal("supply"))}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium py-2.5 rounded-lg transition-all"
                    disabled={loading || approving || supplying}
                  >
                    {needsApproval ? (approving ? "Approving..." : "Approve") : "Supply"}
                  </Button>
                  <Button
                    onClick={() => openModal("withdraw")}
                    className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 font-medium py-2.5 rounded-lg transition-all"
                    disabled={loading || withdrawing}
                  >
                    {withdrawing ? "Withdrawing..." : "Withdraw"}
                  </Button>
                </div>
              </div>

              <div className="h-px bg-zinc-800" />
            </>
          )}

          {currentSupplied === 0 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-400">Available to supply</div>
                </div>
                <div className="text-xl font-semibold text-white mb-3">
                  {loading ? "Loading..." : `${availableToSupply} ${symbol}`}
                </div>
                <div className="text-sm text-gray-500 mb-3"> {availableToSupply}</div>
                <Button
                  onClick={() => (needsApproval ? onApprove?.() : openModal("supply"))}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2.5 rounded-lg transition-all"
                  disabled={loading || approving || supplying}
                >
                  {needsApproval ? (approving ? "Approving..." : "Approve to supply") : "Supply"}
                </Button>
              </div>

              <div className="h-px bg-zinc-800" />
            </>
          )}

          {currentBorrowed > 0 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-400">Your borrows</div>
                  <div className="text-xs text-pink-400 font-medium">{borrowAPY}% APY</div>
                </div>
                <div className="text-xl font-semibold text-white mb-3">
                  {loading ? "Loading..." : `${currentBorrowed} ${symbol}`}
                </div>
                <div className="text-sm text-gray-500 mb-3">$ {currentBorrowed}</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => openModal("borrow")}
                    className="bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 font-medium py-2.5 rounded-lg transition-all"
                    disabled={loading || borrowing}
                  >
                    {borrowing ? "Borrowing..." : "Borrow"}
                  </Button>
                  <Button
                    onClick={() => openModal("repay")}
                    className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium py-2.5 rounded-lg transition-all"
                    disabled={loading || repaying}
                  >
                    {repaying ? "Repaying..." : "Repay"}
                  </Button>
                </div>
              </div>

              <div className="h-px bg-zinc-800" />
            </>
          )}

          {currentBorrowed === 0 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-400">Available to borrow</div>
                </div>
                <div className="text-xl font-semibold text-white mb-3">
                  {loading ? "Loading..." : `${availableToBorrow} ${symbol}`}
                </div>
                <div className="text-sm text-gray-500 mb-3"> {availableToBorrow}</div>
                <Button
                  onClick={() => openModal("borrow")}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2.5 rounded-lg transition-all"
                  disabled={loading || borrowing}
                >
                  {borrowing ? "Borrowing..." : "Borrow"}
                </Button>
              </div>

              <div className="h-px bg-zinc-800" />
            </>
          )}

          {/* Bridge Message */}
          {walletBalance  < 5 && 
          <div className="p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
            <p className="text-sm text-cyan-400 leading-relaxed">
              Your Casper wallet is empty. Purchase or transfer assets or use{" "}
              <Button variant={"link"} className="underline hover:text-cyan-300 transition-colors" onClick={() => openExternalUrl("https://csprbridge.com/")}>
                Casper Bridge
              </Button>{" "}
              to transfer your Ethereum assets.
            </p>
          </div>
}
        </div>
      </div>

      <TransactionModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        type={modalState.type}
        symbol={symbol}
        balance={walletBalance}
        busy={supplying || withdrawing || borrowing || repaying || approving}
        onSubmit={(amount) => {
          if (modalState.type === "supply") {
            onSupply?.(amount)
            return
          }
          if (modalState.type === "withdraw") {
            onWithdraw?.(amount)
            return
          }
          if (modalState.type === "borrow") {
            onBorrow?.(amount)
            return
          }
          if (modalState.type === "repay") {
            onRepay?.(amount)
          }
        }}
        maxAmount={
          modalState.type === "supply"
            ? availableToSupply
            : modalState.type === "repay"
              ? currentBorrowed
              : modalState.type === "withdraw"
                ? currentSupplied
                : availableToBorrow
        }
        apy={modalState.type === "supply" || modalState.type === "withdraw" ? supplyAPY : borrowAPY}
        //@ts-ignore
        txStatus={txStatusForModal}
        txHash={txHash}
        txError={txError}
        explorerBaseUrl={explorerBaseUrl}
      />
    </>
  )
}
