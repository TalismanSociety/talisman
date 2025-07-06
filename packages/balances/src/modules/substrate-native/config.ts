import { SubNativeTokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

export const MODULE_TYPE = SubNativeTokenSchema.shape.type.value
export const PLATFORM = SubNativeTokenSchema.shape.platform.value

// to be used by chaindata too
export const SubNativeTokenConfigSchema = z.strictObject({
  ...TokenConfigBaseSchema.shape,
})

// Do not use this type outside of this module
export type TokenConfig = z.infer<typeof SubNativeTokenConfigSchema>

// Do not use this type outside of this module
export type ModuleConfig = {
  disable?: boolean
}

// Do not use this type outside of this module
export type MiniMetadataExtra = {
  disable?: boolean
  useLegacyTransferableCalculation?: boolean
  existentialDeposit?: string
  nominationPoolsPalletId?: string
  hasSubtensorPallet?: boolean
}
