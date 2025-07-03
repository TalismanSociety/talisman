import z from "zod/v4"

export const EthereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, { message: "Invalid Ethereum address" })
  .transform((val) => val as `0x${string}`)

export type EthereumAddress = z.infer<typeof EthereumAddressSchema>
