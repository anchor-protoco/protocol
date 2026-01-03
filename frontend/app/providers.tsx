"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { CHAIN_NAME, CONTENT_MODE, type CsprClickInitOptions } from "@make-software/csprclick-core-types"
import { ClickProvider, ClickUI, DefaultThemes, buildTheme, useClickRef } from "@make-software/csprclick-ui"
import { ThemeProvider } from "styled-components"
import { PublicKey } from "casper-js-sdk"
import { TransactionsProvider } from "@/app/transactions-context"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

type WalletAccount = {
  public_key?: string
  publicKey?: string
  accountHash?: string
  name?: string
  [key: string]: unknown
}

type WalletContextValue = {
  status: "disconnected" | "connecting" | "connected"
  account: WalletAccount | null
  isReady: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

const WalletContext = createContext<WalletContextValue | null>(null)

function useWalletContext() {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error("WalletContext is not available")
  }
  return ctx
}

function WalletProvider({ children }: { children: React.ReactNode }) {
  const clickRef = useClickRef()
  const [status, setStatus] = useState<WalletContextValue["status"]>("disconnected")
  const [account, setAccount] = useState<WalletAccount | null>(null)

  const updateAccount = useCallback((nextAccount: WalletAccount | null) => {
    const normalized = nextAccount ? withAccountHash(nextAccount) : null
    if (normalized && !normalized.accountHash) {
      console.warn("account hash missing after normalization", normalized)
    }
    setAccount(normalized)
    setStatus(normalized ? "connected" : "disconnected")
  }, [])

  const connect = useCallback(async () => {
    if (!clickRef?.signIn) return
    setStatus("connecting")
    clickRef.signIn()
  }, [clickRef])

  const disconnect = useCallback(async () => {
    if (!clickRef?.signOut) return
    await clickRef.signOut()
    updateAccount(null)
  }, [clickRef, updateAccount])

  useEffect(() => {
    if (!clickRef) return

    const handleSignedIn = (evt: { account?: WalletAccount }) => updateAccount(evt.account ?? null)
    const handleSwitch = (evt: { account?: WalletAccount }) => updateAccount(evt.account ?? null)
    const handleSignedOut = () => updateAccount(null)
    const handleDisconnected = () => updateAccount(null)

    clickRef.on("csprclick:signed_in", handleSignedIn)
    clickRef.on("csprclick:switched_account", handleSwitch)
    clickRef.on("csprclick:signed_out", handleSignedOut)
    clickRef.on("csprclick:disconnected", handleDisconnected)

    return () => {
      clickRef.off("csprclick:signed_in", handleSignedIn)
      clickRef.off("csprclick:switched_account", handleSwitch)
      clickRef.off("csprclick:signed_out", handleSignedOut)
      clickRef.off("csprclick:disconnected", handleDisconnected)
    }
  }, [clickRef, updateAccount])

  const value = useMemo(
    () => ({
      status,
      account,
      isReady: Boolean(clickRef),
      connect,
      disconnect,
    }),
    [status, account, clickRef, connect, disconnect],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function withAccountHash(account: WalletAccount): WalletAccount {
  if (account.accountHash) return account
  const publicKey = account.public_key ?? account.publicKey
  if (!publicKey) return account
  try {
    const pk = PublicKey.fromHex(publicKey)
    const rawHash = pk.accountHash()
    if (typeof rawHash === "string") {
      //@ts-ignore
      return { ...account, accountHash: rawHash.replace(/^account-hash-/, "") }
    }
    const anyHash = rawHash as unknown as {
      toHex?: () => string
      toPrefixedString?: () => string
    }
    if (anyHash.toHex) {
      return { ...account, accountHash: anyHash.toHex() }
    }
    if (anyHash.toPrefixedString) {
      return { ...account, accountHash: anyHash.toPrefixedString().replace(/^account-hash-/, "") }
    }
    if (rawHash instanceof Uint8Array) {
      return { ...account, accountHash: toHex(rawHash) }
    }
    return account
  } catch (error) {
    console.warn("failed to compute account hash", { publicKey, error })
    return account
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useMemo(() => buildTheme(DefaultThemes.csprclick).dark, [])
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
        },
      }),
  )
  const options = useMemo<CsprClickInitOptions>(
    () => ({
      appName: process.env.NEXT_PUBLIC_CSPR_CLICK_APP_NAME ?? "Anchor Protocol",
      appId: process.env.NEXT_PUBLIC_CSPR_CLICK_APP_ID ?? "",
      contentMode: CONTENT_MODE.IFRAME,
      providers: ["casper-wallet", "ledger", "torus-wallet", "casperdash", "metamask-snap", "casper-signer"],
      //@ts-ignore
      chainName: (process.env.NEXT_PUBLIC_CSPR_CLICK_CHAIN_NAME as CHAIN_NAME | undefined) ?? CHAIN_NAME.TESTNET,
    }),
    [],
  )

  return (
    <ClickProvider options={options}>
      <ThemeProvider theme={theme}>
        <ClickUI rootAppElement="body" />
        <QueryClientProvider client={queryClient}>
          <WalletProvider>
            <TransactionsProvider>{children}</TransactionsProvider>
          </WalletProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ClickProvider>
  )
}

export function useWallet() {
  return useWalletContext()
}
