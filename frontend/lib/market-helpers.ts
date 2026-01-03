const SECONDS_PER_YEAR = 31_536_000

export function pow10BigInt(decimals: number) {
  if (decimals <= 0) return BigInt(1)
  return BigInt(`1${"0".repeat(decimals)}`)
}

export function toBigInt(value?: string | null) {
  if (!value) return BigInt(0)
  try {
    return BigInt(value)
  } catch {
    return BigInt(0)
  }
}

export function wadToNumber(value?: string | null) {
  const raw = toBigInt(value)
  return Number(raw) / 1e18
}
//@ts-ignore

export function toTokenAmount(value?: string | null, decimals: number) {
  const raw = toBigInt(value)
  const divisor = pow10BigInt(decimals)
  return Number(raw) / Number(divisor)
}

export function rateToApr(ratePerSec?: string | null) {
  return wadToNumber(ratePerSec) * SECONDS_PER_YEAR * 100
}

export function toPlaceholderName(asset?: string | null) {
  const safe = (asset ?? "").toString()
  if (!safe) return "Asset"
  return `Asset ${safe.slice(0, 6).toUpperCase()}`
}

export function toPlaceholderSymbol(asset?: string | null) {
  const safe = (asset ?? "").toString()
  if (!safe) return "ASSET"
  return safe.slice(0, 4).toUpperCase()
}
