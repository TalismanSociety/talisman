import z from "zod/v4"

export const EthereumAddress = z.custom<`0x${string}`>(
  (val) => typeof val === "string" && /^0x[a-fA-F0-9]{40}$/.test(val),
)
