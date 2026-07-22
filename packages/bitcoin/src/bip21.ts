const SATS_PER_BTC = 100_000_000n
const BTC_DECIMALS = 8

export type Bip21Payment = {
  address: string
  amountSats?: bigint
  label?: string
  message?: string
}

/** exact BTC decimal string → sats, rejecting over-precise or malformed amounts */
const btcToSats = (value: string): bigint | null => {
  const match = /^(\d+)(?:\.(\d{1,8}))?$/.exec(value)
  if (!match) return null
  const [, whole, fraction = ""] = match
  return BigInt(whole) * SATS_PER_BTC + BigInt(fraction.padEnd(BTC_DECIMALS, "0"))
}

const satsToBtc = (sats: bigint): string => {
  const whole = sats / SATS_PER_BTC
  const fraction = (sats % SATS_PER_BTC).toString().padStart(BTC_DECIMALS, "0").replace(/0+$/, "")
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

/**
 * Parses a BIP21 payment URI (`bitcoin:<address>?amount=…&label=…`).
 * Returns null if the input is not a BIP21 URI or is invalid — including unknown
 * `req-*` parameters, which BIP21 mandates treating as a failure. The address is
 * returned as-is: network validation is the caller's responsibility.
 */
export const parseBip21Uri = (uri: string): Bip21Payment | null => {
  const match = /^bitcoin:([a-zA-Z0-9]+)(\?.*)?$/i.exec(uri.trim())
  if (!match) return null
  const [, address, query] = match

  const payment: Bip21Payment = { address }
  if (!query) return payment

  let params: URLSearchParams
  try {
    params = new URLSearchParams(query.slice(1))
  } catch {
    return null
  }

  for (const [key, value] of params) {
    const lowerKey = key.toLowerCase()
    if (lowerKey === "amount") {
      const sats = btcToSats(value)
      if (sats === null || sats <= 0n) return null
      payment.amountSats = sats
    } else if (lowerKey === "label") payment.label = value
    else if (lowerKey === "message") payment.message = value
    // BIP21: an unknown required parameter means the URI must be rejected
    else if (lowerKey.startsWith("req-")) return null
    // other unknown parameters are ignored
  }

  return payment
}

/** Encodes a BIP21 payment URI. Amounts are rendered as exact BTC decimals. */
export const encodeBip21Uri = ({ address, amountSats, label, message }: Bip21Payment): string => {
  const params = new URLSearchParams()
  if (amountSats !== undefined && amountSats > 0n) params.set("amount", satsToBtc(amountSats))
  if (label) params.set("label", label)
  if (message) params.set("message", message)
  const query = params.toString()
  return query ? `bitcoin:${address}?${query}` : `bitcoin:${address}`
}
