import { TokenBaseSchema } from "@talismn/chaindata-provider"

export const TokenConfigBaseSchema = TokenBaseSchema.partial().omit({ id: true })
