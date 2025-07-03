import z from "zod/v4"

import { DotNetworkSchema } from "./networks"
import { HexStringSchema } from "./shared"

export const AnyMiniMetadataSchema = z.strictObject({
  /** The DB id for this metadata */
  id: z.string().nonempty(),
  /** The balance module which created this miniMetadata */
  source: z.string().nonempty(), // TODO make it an enum of balance module types ?
  /** The chain this miniMetadata came from */
  chainId: DotNetworkSchema.shape.id,
  /** The chain specVersion which this miniMetadata is valid for */
  specVersion: DotNetworkSchema.shape.specVersion,
  /** the version of the balances library used to craft the mini metadata */
  version: z.string().nonempty(),
  /** The miniMetadata encoded as a hex string */
  data: HexStringSchema.nullable(),
  // /** module specific information about the chain, such as pallet ids for specific features */
  extra: z.any().nullable(),
})

export type AnyMiniMetadata = z.infer<typeof AnyMiniMetadataSchema>
