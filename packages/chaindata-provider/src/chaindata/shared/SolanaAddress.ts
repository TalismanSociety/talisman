import { base58 } from "@scure/base"
import z from "zod/v4"

// Solana addresses are base58-encoded 32-byte public keys. The regex is a cheap first gate on
// the alphabet and length; only decoding shows whether the string holds exactly 32 bytes.
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

const isSolanaPublicKey = (address: string) => {
  try {
    return base58.decode(address).length === 32
  } catch {
    return false
  }
}

export const SolanaAddressSchema = z
  .string()
  .regex(SOLANA_ADDRESS_REGEX, { message: "Invalid Solana address" })
  .refine(isSolanaPublicKey, { message: "Invalid Solana address" })

export type SolanaAddress = z.infer<typeof SolanaAddressSchema>
