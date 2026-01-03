"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Settings, FileText, ArrowUpDown, Menu, X } from "lucide-react"
import { AccountIdenticon } from "@make-software/csprclick-ui"
import { useWallet } from "@/app/providers"
import { useEffect, useState } from "react"
import { openExternalUrl } from "@/lib/utils"

function shorten(value?: string | null) {
  if (!value) return ""
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

function formatCsprBalance(value?: string | null) {
  if (!value) return "0"
  const motes = Number(value)
  if (!Number.isFinite(motes)) return "0"
  return (motes / 1e9).toFixed(4)
}

export function LayoutHeader() {
  const { account, status, isReady, connect, disconnect } = useWallet()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isConnected = status === "connected"
  const isLoading = !isReady || status === "connecting"
  const accountHash = account?.accountHash ?? ""
  const balance = formatCsprBalance(
    (account as { liquid_balance?: string; balance?: string } | null)?.liquid_balance ??
      (account as { balance?: string } | null)?.balance ??
      null,
  )
  const label = isConnected
    ? shorten(accountHash || account?.publicKey || account?.public_key || "")
    : isLoading
      ? "Connecting..."
      : "Connect wallet"

  useEffect(() => {
    if (!accountHash) return
    console.log("account hash", accountHash)
  }, [accountHash])

     

  return (
    <header className="border-b border-zinc-800 bg-black sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex  gap-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-0 sm:h-16">
          <div className="flex items-center justify-between gap-2 sm:flex-row sm:items-center sm:gap-8 w-full sm:w-auto">
            <Link href="/" className="flex items-center gap-2">
              <div className="text-yellow-400 text-2xl font-bold">
                <img src="/img/logo.jpg" alt="logo" className="w-9 h-9 sm:w-11 sm:h-11 rounded-full"/>
              </div>
          
            </Link>

            <nav className="hidden sm:flex flex-wrap gap-4 sm:gap-6">
              <Link href="/markets" className="text-sm font-medium text-white hover:text-purple-400 transition-colors">
                Markets
              </Link>
              <Link
                href="/leaderboard"
                className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Leaderboard
              </Link>
            </nav>
              <Button
              variant="ghost"
              size="icon"
              className="sm:hidden text-gray-300 hover:text-white border border-zinc-800"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-label="Toggle navigation menu"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white  hidden">
              <FileText className="h-4 w-4 mr-2 " />
              Docs
            </Button>

          

            <Button size={"lg"}
              className={` ${!isConnected ? "bg-yellow-400 hover:bg-yellow-500 text-black font-semibold" : "border bg-gray-900/70 text-white"} flex w-full sm:w-auto items-center gap-2`}
              onClick={isConnected ? disconnect : connect}
              disabled={isLoading}
            >
              {isConnected ? (
                <>
                  <AccountIdenticon hex={accountHash} size="sm" />
                  <span>{label}</span>
                  <span className="text-xs opacity-70">{balance} CSPR</span>
                </>
              ) : (
                <span>{label}</span>
              )}
            </Button>

            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hidden">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="sm:hidden border-t border-zinc-800 pt-4 pb-2">
            <div className="flex flex-col gap-3">
              <Link href="/markets" className="text-sm font-medium text-white hover:text-purple-400 transition-colors">
                Markets
              </Link>
              <Link
                href="/leaderboard"
                className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Leaderboard
              </Link>
              <Button
                variant="link"
                size="sm"
                className="text-white cursor-pointer hover:text-purple-400 flex items-center gap-2 justify-start"
                onClick={() => openExternalUrl("https://testnet.cspr.trade/")}
              >
                <span>Swap</span>
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
