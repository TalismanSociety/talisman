import { TypeRegistry } from "@polkadot/types"
import { SubNativeToken } from "@talismn/balances"
import { get_metadata_digest } from "@talismn/metadata-shortener-wasm"

const trimPrefix = (str: string) => (str.startsWith("0x") ? str.slice(2) : str)

export const getCheckMetadataHashPayloadProps = (
  registry: TypeRegistry,
  metadataRpc: string,
  chainPrefix: number | null,
  specName: string,
  specVersion: number,
  token: SubNativeToken
) => {
  const hasCheckMetadataHash = registry.metadata.extrinsic.signedExtensions.some(
    (ext) => ext.identifier.toString() === "CheckMetadataHash"
  )
  if (!hasCheckMetadataHash) return {}

  const metadataHash = get_metadata_digest(
    trimPrefix(metadataRpc),
    token.symbol,
    token.decimals,
    chainPrefix ?? 42,
    specName,
    specVersion
  )

  return {
    metadataHash: `0x${metadataHash}`,
    mode: 1,
  }
}
