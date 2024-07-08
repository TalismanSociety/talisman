import { merkleizeMetadata } from "@polkadot-api/merkleize-metadata"
import { TypeRegistry } from "@polkadot/types"
import { u8aToHex } from "@polkadot/util"
import { SubNativeToken } from "@talismn/balances"

export const getCheckMetadataHashPayloadProps = (
  metadataRpc: string,
  chainPrefix: number | null,
  specName: string,
  specVersion: number,
  token: SubNativeToken
) => {
  const registry = new TypeRegistry()
  const metadata = registry.createType("Metadata", metadataRpc)
  registry.setMetadata(metadata)

  const hasCheckMetadataHash =
    metadata.version >= 15 &&
    metadata.asLatest.extrinsic.signedExtensions.some(
      (ext) => ext.identifier.toString() === "CheckMetadataHash"
    )
  if (!hasCheckMetadataHash) return {}

  const metadataHash = merkleizeMetadata(metadataRpc, {
    tokenSymbol: token.symbol,
    decimals: token.decimals,
    base58Prefix: registry.chainSS58 ?? 42,
    specName,
    specVersion,
  }).digest()

  return {
    metadataHash: u8aToHex(metadataHash),
    mode: 1,
  }
}
