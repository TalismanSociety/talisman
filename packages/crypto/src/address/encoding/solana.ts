import { ed25519 } from "@noble/curves/ed25519.js"
import { base58 } from "@scure/base"

export const encodeAddressSolana = (publicKey: Uint8Array): string => {
  if (publicKey.length !== 32)
    throw new Error("Public key must be 32 bytes long for Solana base58 encoding")
  return base58.encode(publicKey)
}
export function isSolanaAddress(address: string): boolean {
  try {
    const bytes = base58.decode(address)
    return bytes.length === 32
  } catch {
    return false
  }
}

/**
 * Whether the address is a valid ed25519 public key (on-curve).
 *
 * Program-derived addresses (PDAs) are off-curve by construction: no private key can exist
 * for them, so a regular wallet cannot recover tokens sent to an account they own.
 */
export function isOnCurveSolanaAddress(address: string): boolean {
  try {
    ed25519.Point.fromBytes(base58.decode(address))
    return true
  } catch {
    return false
  }
}
