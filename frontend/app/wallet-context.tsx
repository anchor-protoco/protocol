"use client"

import React, { createContext, useContext, useMemo, useState } from "react"

export type WalletAccount = {
  publicKey?: string
  accountHash?: string
  [key: string]: unknown
}

type WalletContextValue = {
  account: WalletAccount | null
  isConnected: boolean
  setAccount: (account: WalletAccount | null) => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletStateProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<WalletAccount | null>(null)

  const value = useMemo<WalletContextValue>(
    () => ({
      account,
      isConnected: Boolean(account),
      setAccount,
    }),
    [account],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error("WalletContext is not available")
  }
  return ctx
}
