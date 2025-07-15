import { AnyMiniMetadata, MINIMETADATA_VERSION } from "@talismn/chaindata-provider"
import { toHex, Twox128 } from "@talismn/scale"

/** For fast db access, you can calculate the primary key for a miniMetadata using this method */
export const deriveMiniMetadataId = ({
  source,
  chainId,
  specVersion,
}: Pick<AnyMiniMetadata, "source" | "chainId" | "specVersion">): string =>
  toHex(
    Twox128(new TextEncoder().encode(`${source}${chainId}${specVersion}${MINIMETADATA_VERSION}`)),
  ).slice(-32)

export type MiniMetadata<Extra = unknown> = Omit<AnyMiniMetadata, "extra"> & { extra: Extra }
