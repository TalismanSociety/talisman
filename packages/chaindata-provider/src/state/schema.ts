import z from "zod/v4"

import { AnyMiniMetadataSchema, NetworkSchema, TokenSchema } from "../chaindata"

export const ChaindataFileSchema = z.object({
  networks: z.array(NetworkSchema),
  tokens: z.array(TokenSchema),
  miniMetadatas: z.array(AnyMiniMetadataSchema),
})

export type Chaindata = z.infer<typeof ChaindataFileSchema>
