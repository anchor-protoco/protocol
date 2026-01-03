"use client"

import type React from "react"
import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { TransactionStatus } from "@make-software/csprclick-core-types"
import { useClickRef } from "@make-software/csprclick-ui"

type TxKind = "approve" | "supply" | "borrow" | "withdraw" | "repay"
type TxStatus = "idle" | "pending" | "success" | "failed"

type TxRecord = {
  kind: TxKind
  status: TxStatus
  hash?: string | null
  error?: string | null
  rawStatus?: string | null
  updatedAt?: number
}

type TransactionsContextValue = {
  transactions: Record<TxKind, TxRecord>
  sendTransaction: (
    kind: TxKind,
    txPayload: unknown,
    publicKeyHex: string,
    onSuccess?: () => void,
  ) => Promise<TxRecord>
  resetTransaction: (kind: TxKind) => void
}

const initialTransactions: Record<TxKind, TxRecord> = {
  approve: { kind: "approve", status: "idle" },
  supply: { kind: "supply", status: "idle" },
  borrow: { kind: "borrow", status: "idle" },
  withdraw: { kind: "withdraw", status: "idle" },
  repay: { kind: "repay", status: "idle" },
}

const TransactionsContext = createContext<TransactionsContextValue | undefined>(undefined)

function extractClickHash(result: { deployHash?: string | null; transactionHash?: string | null; hash?: string | null }) {
  return result.transactionHash ?? result.deployHash ?? result.hash ?? null
}

function extractFailureMessage(data: any): string | null {
  const failure =
    data?.execution_results?.[0]?.result?.Failure?.error_message ??
    data?.execution_results?.[0]?.result?.Failure ??
    data?.execution_results?.[0]?.result?.error_message ??
    data?.execution_results?.[0]?.result?.failure ??
    data?.execution_result?.error_message ??
    data?.error_message ??
    null
  return failure ? String(failure) : null
}

function statusFromClick(status: string, data: any): { status: TxStatus; error?: string | null } {
  if (data?.cancelled) {
    return { status: "failed", error: data?.error ?? "Transaction cancelled" }
  }
  if (data?.error) {
    return { status: "failed", error: String(data.error) }
  }
  if (status === TransactionStatus.SENT) return { status: "pending" }
  if (status === TransactionStatus.PROCESSED) {
    const failure = extractFailureMessage(data)
    console.log("transaction data", data)
    return failure ? { status: "failed", error: failure } : { status: "success" }
  }
  if (
    status === TransactionStatus.CANCELLED ||
    status === TransactionStatus.EXPIRED ||
    status === TransactionStatus.TIMEOUT ||
    status === TransactionStatus.ERROR
  ) {
    return { status: "failed", error: extractFailureMessage(data) }
  }
  return { status: "pending" }
}

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const clickRef = useClickRef()
  const [transactions, setTransactions] = useState<Record<TxKind, TxRecord>>(initialTransactions)

  const updateTx = useCallback((kind: TxKind, next: Partial<TxRecord>) => {
    setTransactions((prev) => ({
      ...prev,
      [kind]: {
        ...prev[kind],
        ...next,
        updatedAt: Date.now(),
      },
    }))
  }, [])

  const resetTransaction = useCallback((kind: TxKind) => {
    setTransactions((prev) => ({
      ...prev,
      [kind]: { kind, status: "idle" },
    }))
  }, [])

  const sendTransaction = useCallback(
    async (kind: TxKind, txPayload: unknown, publicKeyHex: string, onSuccess?: () => void) => {
      if (!clickRef?.send) {
        throw new Error("Wallet connection is not ready")
      }

      updateTx(kind, { status: "pending", error: null, rawStatus: null, hash: null })
//@ts-ignore
      const result = await clickRef.send(txPayload, publicKeyHex, (status: string, data: any) => {
        const mapped = statusFromClick(status, data)
        updateTx(kind, {
          status: mapped.status,
          rawStatus: status,
          error: mapped.error ?? null,
        })
        if (mapped.status === "success") {
          onSuccess?.()
        }
      })

      const hash = result ? extractClickHash(result) : null
      updateTx(kind, {
        hash,
      })

      const finalRecord = {
        kind,
        status: transactions[kind]?.status ?? "pending",
        hash,
        error: transactions[kind]?.error ?? null,
        rawStatus: transactions[kind]?.rawStatus ?? null,
      }

      return finalRecord
    },
    [clickRef, transactions, updateTx],
  )

  const value = useMemo(
    () => ({
      transactions,
      sendTransaction,
      resetTransaction,
    }),
    [transactions, sendTransaction, resetTransaction],
  )

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>
}

export function useTransactions() {
  const context = useContext(TransactionsContext)
  if (!context) {
    throw new Error("useTransactions must be used within TransactionsProvider")
  }
  return context
}
