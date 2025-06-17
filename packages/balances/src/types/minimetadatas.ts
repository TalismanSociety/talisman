import { u8aToHex } from "@polkadot/util"
import { xxhashAsU8a } from "@polkadot/util-crypto"
import { ChainId } from "@talismn/chaindata-provider"

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

export type MiniMetadata = {
  /** The DB id for this metadata */
  id: string

  /** The balance module which created this miniMetadata */
  source: string

  /** The chain this miniMetadata came from */
  chainId: ChainId

  /** The chain specVersion which this miniMetadata is valid for */
  specVersion: number

  /** the version of the balances library used to craft the mini metadata */
  libVersion: string

  /** The miniMetadata encoded as a hex string */
  data: `0x${string}` | null
}
