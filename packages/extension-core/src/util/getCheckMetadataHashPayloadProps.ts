import { merkleizeMetadata } from "@polkadot-api/merkleize-metadata"
import { TypeRegistry } from "@polkadot/types"
import { u8aToHex } from "@polkadot/util"
import { SubNativeToken } from "@talismn/balances"
import { Chain } from "@talismn/chaindata-provider"

export const getCheckMetadataHashPayloadProps = (
  chain: Chain,
  metadataRpc: string,
  specName: string,
  specVersion: number,
  token: SubNativeToken,
) => {
  const registry = new TypeRegistry()
  const metadata = registry.createType("Metadata", metadataRpc)
  registry.setMetadata(metadata)

  const hasCheckMetadataHash =
    chain.hasCheckMetadataHash && // can be toggled off from chaindata
    metadata.version >= 15 &&
    metadata.asLatest.extrinsic.signedExtensions.some(
      (ext) => ext.identifier.toString() === "CheckMetadataHash",
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
