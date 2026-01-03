"use client"

import { useMemo, useState } from "react"
import { UserInfoPanel as NewUserInfoPanel } from "@/components/new-ui-designs/new-user-info-panel"
import { useWallet } from "@/app/providers"
import { useClickRef } from "@make-software/csprclick-ui"
import { buildApproveTransaction } from "@/lib/casper/cep18"
import { buildLendingMarketTransaction } from "@/lib/casper/lending-market"
import { useTransactions } from "@/app/transactions-context"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchJson, getApiBaseUrl } from "@/lib/api"

type UserPanelProps = {
  asset: string
  marketPackageHash: string
  decimals: number
  symbol: string
  supplyAPY: number
  borrowAPY: number
}

type PositionSummary = {
  net?: {
    supply?: string
    borrow?: string
  }
  derived?: {
    borrowLimit?: string
    liquidationThreshold?: string
    availableBorrow?: string
    healthFactor?: string | null
  }
}

function toBigInt(value?: string | null) {
  if (!value) return BigInt(0)
  try {
    return BigInt(value)
  } catch {
    return BigInt(0)
  }
}

function pow10BigInt(decimals: number) {
  if (decimals <= 0) return BigInt(1)
  return BigInt(`1${"0".repeat(decimals)}`)
}

function toTokenAmount(value?: string | null, decimals = 6) {
  const raw = toBigInt(value)
  const divisor = pow10BigInt(decimals)
  return Number(raw) / Number(divisor)
}

function toRawTokenAmount(value: string, decimals: number) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const match = trimmed.match(/^\d+(\.\d+)?$/)
  if (!match) return null
  const [whole, frac = ""] = trimmed.split(".")
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals)
  const combined = `${whole}${padded}`.replace(/^0+/, "") || "0"
  return combined
}

export function MarketUserPanel({
  asset,
  marketPackageHash,
  decimals,
  symbol,
  supplyAPY,
  borrowAPY,
}: UserPanelProps) {
  const { account, status, isReady } = useWallet()
  const accountHash = account?.accountHash ?? ""
  const isConnected = status === "connected"
  const baseUrl = getApiBaseUrl()
  const [approving, setApproving] = useState(false)
  const [supplying, setSupplying] = useState(false)
  const [borrowing, setBorrowing] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [repaying, setRepaying] = useState(false)
  const clickRef = useClickRef()
  const { transactions, sendTransaction } = useTransactions()
  const queryClient = useQueryClient()

  const balanceQuery = useQuery({
    queryKey: ["balance", accountHash, asset],
    queryFn: () =>
      fetchJson<{ balance?: string }>(
        `${baseUrl}/api/v1/token/balance?accountHash=${accountHash}&contractHash=${asset}`,
      ),
    enabled: isConnected && Boolean(accountHash),
  })

  const positionsQuery = useQuery({
    queryKey: ["positions", accountHash, marketPackageHash],
    queryFn: () =>
      fetchJson<{ positions?: PositionSummary[] }>(
        `${baseUrl}/api/v1/activity/account/${accountHash}/positions?marketPackageHash=${marketPackageHash}`,
      ),
    enabled: isConnected && Boolean(accountHash),
  })

  const allowanceQuery = useQuery({
    queryKey: ["allowance", accountHash, asset, marketPackageHash],
    queryFn: () =>
      fetchJson<{ allowance?: string; resolvedSpenderContractHash?: string }>(
        `${baseUrl}/api/v1/token/allowance?ownerAccountHash=${accountHash}&tokenContractHash=${asset}&spenderContractHash=${marketPackageHash}`,
      ),
    enabled: isConnected && Boolean(accountHash),
  })

  const balance = balanceQuery.data?.balance ?? "0"
  const positions = Array.isArray(positionsQuery.data?.positions) ? positionsQuery.data?.positions[0] : null
  const allowance =allowanceQuery.data?.allowance ?? "10"
  const loading = balanceQuery.isLoading || positionsQuery.isLoading || allowanceQuery.isLoading

 console.log("allowance is", allowance)

  const availableToSupply = useMemo(() => toTokenAmount(balance, decimals), [balance, decimals])
  const netSupply = useMemo(() => {
    const value = positions?.net?.supply ?? "0"
    return toTokenAmount(value, decimals)
  }, [positions, decimals])
  const netBorrow = useMemo(() => {
    const value = positions?.net?.borrow ?? "0"
    return toTokenAmount(value, decimals)
  }, [positions, decimals])
  const availableBorrow = useMemo(() => {
    const value = positions?.derived?.availableBorrow ?? "0"
    return toTokenAmount(value, decimals)
  }, [positions, decimals])
  const needsApproval = useMemo(() => toBigInt(allowance) === BigInt(0), [allowance])

  const getPublicKeyHex = () =>
    (account as { public_key?: string; publicKey?: string } | null)?.public_key ??
    (account as { public_key?: string; publicKey?: string } | null)?.publicKey

  const triggerRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["markets", "summary"] })
    await queryClient.invalidateQueries({ queryKey: ["markets", "summary", asset] })
    await queryClient.invalidateQueries({ queryKey: ["positions", accountHash, marketPackageHash] })
    await queryClient.invalidateQueries({ queryKey: ["allowance", accountHash, asset, marketPackageHash] })
    await queryClient.invalidateQueries({ queryKey: ["balance", accountHash, asset] })
    await queryClient.invalidateQueries({ queryKey: ["activity", accountHash, marketPackageHash] })
  }

  const latestTx = useMemo(() => {
    const items = Object.values(transactions)
    if (items.length === 0) return null
    return items.reduce((latest, current) =>
      (current.updatedAt ?? 0) > (latest.updatedAt ?? 0) ? current : latest,
    )
  }, [transactions])


  const handleApprove = async () => {
    if (!isConnected || !accountHash || !clickRef || approving) return
    const publicKeyHex = getPublicKeyHex()
    console.log("public key hex", publicKeyHex)
    if (!publicKeyHex) return
    const amount = balance && balance !== "0" ? balance : "0"
    if (amount === "0") return

      
    setApproving(true)
    try {
      const tx = buildApproveTransaction({
        tokenPackageHash: asset,
        spenderContractHash:  marketPackageHash,
        amount,
        senderPublicKeyHex: publicKeyHex,
        chainName: process.env.NEXT_PUBLIC_CASPER_CHAIN_NAME,
        paymentAmountMotes: Number(process.env.NEXT_PUBLIC_CASPER_PAYMENT_AMOUNT ?? "3000000000"),
      })
      const txPayload = { Version1: tx.toJSON() }
      await sendTransaction("approve", txPayload, publicKeyHex, () => {
        void triggerRefresh()
      })
    } finally {
      setApproving(false)
    }
  }

  const handleSupply = async (amountInput: string) => {
    if (!isConnected || !accountHash || !clickRef || supplying) return
    const publicKeyHex = getPublicKeyHex()
    if (!publicKeyHex) return
    const rawAmount = toRawTokenAmount(amountInput, decimals)
    if (!rawAmount || rawAmount === "0") return

    setSupplying(true)
    try {
      const tx = buildLendingMarketTransaction({
        marketPackageHash,
        entryPoint: "deposit",
        amount: rawAmount,
        senderPublicKeyHex: publicKeyHex,
        chainName: process.env.NEXT_PUBLIC_CASPER_CHAIN_NAME,
        paymentAmountMotes: Number(process.env.NEXT_PUBLIC_CASPER_PAYMENT_AMOUNT ?? "3000000000"),
      })
      const txPayload = { Version1: tx.toJSON() }
      await sendTransaction("supply", txPayload, publicKeyHex, () => {
        void triggerRefresh()
      })
    } finally {
      setSupplying(false)
    }
  }

  const handleBorrow = async (amountInput: string) => {
    if (!isConnected || !accountHash || !clickRef || borrowing) return
    const publicKeyHex = getPublicKeyHex()
    if (!publicKeyHex) return
    const rawAmount = toRawTokenAmount(amountInput, decimals)
    if (!rawAmount || rawAmount === "0") return

    setBorrowing(true)
    try {
      const tx = buildLendingMarketTransaction({
        marketPackageHash,
        entryPoint: "borrow",
        amount: rawAmount,
        senderPublicKeyHex: publicKeyHex,
        chainName: process.env.NEXT_PUBLIC_CASPER_CHAIN_NAME,
        paymentAmountMotes: Number(process.env.NEXT_PUBLIC_CASPER_PAYMENT_AMOUNT ?? "3000000000"),
      })
      const txPayload = { Version1: tx.toJSON() }
      await sendTransaction("borrow", txPayload, publicKeyHex, () => {
        void triggerRefresh()
      })
    } finally {
      setBorrowing(false)
    }
  }

  const handleWithdraw = async (amountInput: string) => {
    if (!isConnected || !accountHash || !clickRef || withdrawing) return
    const publicKeyHex = getPublicKeyHex()
    if (!publicKeyHex) return
    const rawAmount = toRawTokenAmount(amountInput, decimals)
    if (!rawAmount || rawAmount === "0") return

    setWithdrawing(true)
    try {
      const tx = buildLendingMarketTransaction({
        marketPackageHash,
        entryPoint: "withdraw",
        amount: rawAmount,
        senderPublicKeyHex: publicKeyHex,
        chainName: process.env.NEXT_PUBLIC_CASPER_CHAIN_NAME,
        paymentAmountMotes: Number(process.env.NEXT_PUBLIC_CASPER_PAYMENT_AMOUNT ?? "3000000000"),
      })
      const txPayload = { Version1: tx.toJSON() }
      await sendTransaction("withdraw", txPayload, publicKeyHex, () => {
        void triggerRefresh()
      })
    } finally {
      setWithdrawing(false)
    }
  }

  const handleRepay = async (amountInput: string) => {
    if (!isConnected || !accountHash || !clickRef || repaying) return
    const publicKeyHex = getPublicKeyHex()
    if (!publicKeyHex) return
    const rawAmount = toRawTokenAmount(amountInput, decimals)
    if (!rawAmount || rawAmount === "0") return

    setRepaying(true)
    try {
      const tx = buildLendingMarketTransaction({
        marketPackageHash,
        entryPoint: "repay",
        amount: rawAmount,
        senderPublicKeyHex: publicKeyHex,
        chainName: process.env.NEXT_PUBLIC_CASPER_CHAIN_NAME,
        paymentAmountMotes: Number(process.env.NEXT_PUBLIC_CASPER_PAYMENT_AMOUNT ?? "3000000000"),
      })
      const txPayload = { Version1: tx.toJSON() }
      await sendTransaction("repay", txPayload, publicKeyHex, () => {
        void triggerRefresh()
      })
    } finally {
      setRepaying(false)
    }
  }

  return (
    <NewUserInfoPanel
      isConnected={isReady && isConnected}
      loading={loading}
      walletBalance={availableToSupply}
      availableToSupply={availableToSupply}
      availableToBorrow={availableBorrow}
      symbol={symbol}
      supplyAPY={supplyAPY}
      borrowAPY={borrowAPY}
      currentSupplied={netSupply}
      currentBorrowed={netBorrow}
      needsApproval={needsApproval}
      onApprove={handleApprove}
      approving={approving}
      onSupply={handleSupply}
      onWithdraw={handleWithdraw}
      onBorrow={handleBorrow}
      onRepay={handleRepay}
      supplying={supplying}
      withdrawing={withdrawing}
      borrowing={borrowing}
      repaying={repaying}
      txStatus={latestTx?.status ?? null}
      txHash={latestTx?.hash ?? null}
      txError={latestTx?.error ?? null}
      explorerBaseUrl={process.env.NEXT_PUBLIC_CASPER_EXPLORER_URL}
    />
  )
}
