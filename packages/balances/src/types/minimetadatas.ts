import { u8aToHex } from "@polkadot/util"
import { ChainId } from "@talismn/chaindata-provider"
import { twox64 } from "@talismn/scale"

/** For fast db access, you can calculate the primary key for a miniMetadata using this method */
export const deriveMiniMetadataId = ({
  source,
  chainId,
  specName,
  specVersion,
  balancesConfig,
}: Pick<
  MiniMetadata,
  "source" | "chainId" | "specName" | "specVersion" | "balancesConfig"
>): string =>
  u8aToHex(
    twox64.hash(
      new TextEncoder().encode(`${source}${chainId}${specName}${specVersion}${balancesConfig}`)
    ),
    undefined,
    false
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

  /** The chain specName which this miniMetadata is valid for */
  specName: string

  /** The chain specVersion which this miniMetadata is valid for */
  specVersion: string

  /** The JSON-encoded chain balancesConfig which this miniMetadata is valid for */
  balancesConfig: string

  /** The version of the metadata format e.g. 13, 14, 15, etc */
  version: number

  /** The miniMetadata encoded as a hex string */
  data: `0x${string}` | null

  /**
   * Some balance modules need a little bit of extra data in addition to the miniMetadata.
   * They can store that data as a JSON-encoded string here.
   */
  extra: string
}
