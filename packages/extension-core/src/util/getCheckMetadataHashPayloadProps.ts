import { merkleizeMetadata } from "@polkadot-api/merkleize-metadata"
import { u8aToHex } from "@polkadot/util"
import { DotNetwork, SubNativeToken } from "@talismn/chaindata-provider"
import { decAnyMetadata, getDynamicBuilder, getLookupFn, unifyMetadata } from "@talismn/scale"

export const getCheckMetadataHashPayloadProps = (
  chain: DotNetwork,
  metadataRpc: string,
  specName: string,
  specVersion: number,
  token: SubNativeToken,
) => {
  const metadata = unifyMetadata(decAnyMetadata(metadataRpc))

  const hasCheckMetadataHash =
    chain.hasCheckMetadataHash &&
    metadata.extrinsic.signedExtensions.some((ext) => ext.identifier === "CheckMetadataHash")
  if (!hasCheckMetadataHash) return {}

  const builder = getDynamicBuilder(getLookupFn(metadata))

  const metadataHash = merkleizeMetadata(metadataRpc, {
    tokenSymbol: token.symbol,
    decimals: token.decimals,
    base58Prefix: builder.ss58Prefix ?? 42,
    specName,
    specVersion,
  }).digest()

  return {
    metadataHash: u8aToHex(metadataHash),
    mode: 1,
  }
}
