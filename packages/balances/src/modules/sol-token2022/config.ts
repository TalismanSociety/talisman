import { SolToken2022TokenSchema } from "@talismn/chaindata-provider"

export const MODULE_TYPE = SolToken2022TokenSchema.shape.type.value
export const PLATFORM = SolToken2022TokenSchema.shape.platform.value

export type { SolToken2022TokenConfig as TokenConfig } from "./types"
