import z from "zod/v4"

// Solana addresses are base58-encoded 32-byte public keys
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export const SolanaAddressSchema = z
  .string()
  .regex(SOLANA_ADDRESS_REGEX, { message: "Invalid Solana address" })

export type SolanaAddress = z.infer<typeof SolanaAddressSchema>
