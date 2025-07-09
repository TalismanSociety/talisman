import { AnyMiniMetadata, MINIMETADATA_VERSION } from "@talismn/chaindata-provider"
import { toHex, Twox64Concat } from "@talismn/scale"

/** For fast db access, you can calculate the primary key for a miniMetadata using this method */
export const deriveMiniMetadataId = ({
  source,
  chainId,
  specVersion,
}: Pick<AnyMiniMetadata, "source" | "chainId" | "specVersion">): string =>
  toHex(
    Twox64Concat(
      new TextEncoder().encode(`${source}${chainId}${specVersion}${MINIMETADATA_VERSION}`),
    ),
  ).slice(-64)

export type MiniMetadata<Extra = unknown> = Omit<AnyMiniMetadata, "extra"> & { extra: Extra }
