import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

// to be used by chaindata too
export const SubNativeTokenConfigSchema = z.strictObject({
  ...TokenConfigBaseSchema.shape,
})

// Do not use this type outside of this module
export type SubNativeTokenConfig = z.infer<typeof SubNativeTokenConfigSchema>

export const SubNativeModuleConfigSchema = z.strictObject({
  disable: z.boolean().optional(),
})

// Do not use this type outside of this module
export type SubNativeModuleConfig = z.infer<typeof SubNativeModuleConfigSchema>

export const SubNativeMiniMetadataExtraSchema = z.strictObject({
  disable: z.boolean().optional(),
  useLegacyTransferableCalculation: z.boolean().optional(),
  existentialDeposit: z.string().optional(),
  nominationPoolsPalletId: z.string().optional(),
})

// Do not use this type outside of this module
export type SubNativeMiniMetadataExtra = z.infer<typeof SubNativeMiniMetadataExtraSchema>
