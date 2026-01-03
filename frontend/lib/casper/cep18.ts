"use client"

import { Args, CLValue, ContractCallBuilder, Key, PublicKey } from "casper-js-sdk"

const DEFAULT_CHAIN_NAME = "casper-test"
const DEFAULT_PAYMENT_MOTES = 3_000_000_000

function normalizeHex(input: string) {
  return input.replace(/^0x/, "").replace(/^hash-/, "").replace(/^contract-package-/, "")
}

export function buildApproveTransaction(params: {
  tokenPackageHash: string
  spenderContractHash: string
  amount: string
  senderPublicKeyHex: string
  chainName?: string
  paymentAmountMotes?: number
}) {
  const tokenPackageHash = normalizeHex(params.tokenPackageHash)
  const spenderContractHash = normalizeHex(params.spenderContractHash)
  const chainName = params.chainName ?? DEFAULT_CHAIN_NAME
  const paymentAmount = params.paymentAmountMotes ?? DEFAULT_PAYMENT_MOTES

  const args = Args.fromMap({
    spender: CLValue.newCLKey(Key.newKey(`hash-${spenderContractHash}`)),
    amount: CLValue.newCLUInt256(params.amount),
  })

  return new ContractCallBuilder()
    .byPackageHash(tokenPackageHash)
    .entryPoint("approve")
    .from(PublicKey.fromHex(params.senderPublicKeyHex))
    .chainName(chainName)
    .payment(paymentAmount, 1)
    .runtimeArgs(args)
    .build()
}
