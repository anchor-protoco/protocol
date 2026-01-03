"use client"

import { Args, CLValue, ContractCallBuilder, PublicKey } from "casper-js-sdk"

const DEFAULT_CHAIN_NAME = "casper-test"
const DEFAULT_PAYMENT_MOTES = 3_000_000_000

function normalizeHex(input: string) {
  return input.replace(/^0x/, "").replace(/^hash-/, "").replace(/^contract-package-/, "")
}

export function buildLendingMarketTransaction(params: {
  marketPackageHash: string
  entryPoint: "deposit" | "withdraw" | "borrow" | "repay"
  amount: string
  senderPublicKeyHex: string
  chainName?: string
  paymentAmountMotes?: number
}) {
  const marketPackageHash = normalizeHex(params.marketPackageHash)
  const chainName = params.chainName ?? DEFAULT_CHAIN_NAME
  const paymentAmount = params.paymentAmountMotes ?? DEFAULT_PAYMENT_MOTES

  const args = Args.fromMap({
    amount: CLValue.newCLUInt256(params.amount),
  })

  return new ContractCallBuilder()
    .byPackageHash(marketPackageHash)
    .entryPoint(params.entryPoint)
    .from(PublicKey.fromHex(params.senderPublicKeyHex))
    .chainName(chainName)
    .payment(paymentAmount, 1)
    .runtimeArgs(args)
    .build()
}
