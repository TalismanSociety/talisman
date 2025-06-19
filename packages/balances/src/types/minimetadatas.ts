import { u8aToHex } from "@polkadot/util"
import { xxhashAsU8a } from "@polkadot/util-crypto"
import { DotNetworkSchema } from "@talismn/chaindata-provider"
import { HexStringSchema } from "@talismn/chaindata-provider/src/chaindata/shared"
import z from "zod/v4"

import { AnyNewBalanceModule, InferChainMeta } from "../modules"

/** For fast db access, you can calculate the primary key for a miniMetadata using this method */
export const deriveMiniMetadataId = ({
  source,
  chainId,
  specVersion,
  libVersion,
}: Pick<MiniMetadata, "source" | "chainId" | "specVersion" | "libVersion">): string =>
  u8aToHex(
    xxhashAsU8a(new TextEncoder().encode(`${source}${chainId}${specVersion}${libVersion}`), 64),
    undefined,
    false,
  )

export type MiniMetadataStatus =
  /** Metadata is up to date */
  | "good"
  /** Metadata exists, but needs to be updated */
  | "outdated"
  /** Metadata doesn't exist */
  | "none"

export const MiniMetadataBaseSchema = z.strictObject({
  /** The DB id for this metadata */
  id: z.string().nonempty(),
  /** The balance module which created this miniMetadata */
  source: z.string().nonempty(), // TODO make it an enum of balance module types
  /** The chain this miniMetadata came from */
  chainId: DotNetworkSchema.shape.id,
  /** The chain specVersion which this miniMetadata is valid for */
  specVersion: DotNetworkSchema.shape.specVersion,
  /** the version of the balances library used to craft the mini metadata */
  libVersion: z.string().nonempty(),
  /** The miniMetadata encoded as a hex string */
  data: HexStringSchema.nullable(),
  // /** module specific information about the chain, such as pallet ids for specific features */
  extra: z.any().nullable(),
})

export type MiniMetadata<M extends AnyNewBalanceModule = AnyNewBalanceModule> = Omit<
  z.infer<typeof MiniMetadataBaseSchema>,
  "extra"
> & {
  extra: InferChainMeta<M>["extra"]
}
