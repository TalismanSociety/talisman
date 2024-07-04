import { merkleizeMetadata } from "@polkadot-api/merkleize-metadata"
import { TypeRegistry } from "@polkadot/types"
import { u8aToHex } from "@polkadot/util"
import { SubNativeToken } from "@talismn/balances"

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

  const metadataHash = merkleizeMetadata(metadataRpc, {
    tokenSymbol: token.symbol,
    decimals: token.decimals,
    base58Prefix: chainPrefix ?? 42,
    specName,
    specVersion,
  }).digest()

  return {
    metadataHash: u8aToHex(metadataHash),
    mode: 1,
  }
}
