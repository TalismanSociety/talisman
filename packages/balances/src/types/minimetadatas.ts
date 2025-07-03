import { u8aToHex } from "@polkadot/util"
import { xxhashAsU8a } from "@polkadot/util-crypto"
import { AnyMiniMetadataSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { AnyNewBalanceModule, InferChainMeta } from "../modules"

/** For fast db access, you can calculate the primary key for a miniMetadata using this method */
export const deriveMiniMetadataId = ({
  source,
  chainId,
  specVersion,
  version,
}: Pick<MiniMetadata, "source" | "chainId" | "specVersion" | "version">): string =>
  u8aToHex(
    xxhashAsU8a(new TextEncoder().encode(`${source}${chainId}${specVersion}${version}`), 64),
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

export type MiniMetadata<M extends AnyNewBalanceModule = AnyNewBalanceModule> = Omit<
  z.infer<typeof AnyMiniMetadataSchema>,
  "extra"
> & {
  extra: InferChainMeta<M>["extra"]
}
