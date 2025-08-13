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
  } catch (error) {
    return false
  }
}
