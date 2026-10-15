import { z } from "zod/v4"

export const signetVaultSchema = z.object({
  address: z.string(),
  name: z.string(),
  chain: z.object({
    genesisHash: z.templateLiteral(["0x", z.string().regex(/^[0-9a-fA-F]{64}$/)]),
  }),
})

export type SignetVault = z.infer<typeof signetVaultSchema>
