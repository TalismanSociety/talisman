import z from "zod/v4"

export const HexStringSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]+$/, { message: "Invalid HexString" })
  .transform((val) => val as `0x${string}`)

export type HexString = z.infer<typeof HexStringSchema>
