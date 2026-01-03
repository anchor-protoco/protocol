"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type TransactionActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  symbol: string
  maxAmount?: number
  minAmount?: number
  onConfirm: (amount: string) => void
  confirmLabel: string
  busy?: boolean
}

function formatMaxAmount(value?: number) {
  if (value === undefined || Number.isNaN(value)) return ""
  const fixed = value.toFixed(6)
  return fixed.replace(/\.?0+$/, "")
}

export function TransactionActionDialog({
  open,
  onOpenChange,
  title,
  description,
  symbol,
  maxAmount,
  minAmount,
  onConfirm,
  confirmLabel,
  busy = false,
}: TransactionActionDialogProps) {
  const [amount, setAmount] = useState("")
  const maxValue = useMemo(() => formatMaxAmount(maxAmount), [maxAmount])
  const minValue = useMemo(() => formatMaxAmount(minAmount), [minAmount])
  const numericAmount = useMemo(() => Number(amount), [amount])

  const validation = useMemo(() => {
    if (!amount) return "Enter an amount"
    if (Number.isNaN(numericAmount)) return "Invalid number"
    if (numericAmount <= 0) return "Amount must be greater than 0"
    if (minAmount !== undefined && numericAmount < minAmount) {
      return `Minimum is ${minValue} ${symbol}`
    }
    if (maxAmount !== undefined && numericAmount > maxAmount) {
      return `Maximum is ${maxValue} ${symbol}`
    }
    return null
  }, [amount, maxAmount, minAmount, minValue, maxValue, numericAmount, symbol])

  const handleClose = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      setAmount("")
    }
  }

  const handleConfirm = () => {
    if (!amount) return
    onConfirm(amount)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-gray-400">{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="space-y-3">
          <label className="text-sm text-gray-400">Amount</label>
          <div className="flex items-center gap-3">
            <Input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={`0 ${symbol}`}
              className="bg-zinc-900 border-zinc-800 text-white"
            />
            <Button
              type="button"
              variant="ghost"
              className="text-xs text-gray-300 hover:text-white"
              onClick={() => setAmount(maxValue)}
              disabled={!maxValue || busy}
            >
              Max
            </Button>
          </div>
          {maxValue ? (
            <div className="text-xs text-gray-500">Max available: {maxValue} {symbol}</div>
          ) : null}
          {validation ? <div className="text-xs text-red-400">{validation}</div> : null}
        </div>
        <DialogFooter>
          <Button
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
            onClick={handleConfirm}
            disabled={Boolean(validation) || busy}
          >
            {busy ? "Working..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
