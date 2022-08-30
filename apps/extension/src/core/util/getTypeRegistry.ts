import { getChainMetadataRpc } from "@core/util/getChainMetadataRpc"
import { Metadata, TypeRegistry } from "@polkadot/types"

export const getTypeRegistry = async (chainId: string, blockHash?: string) => {
  const chainMetadataRpc = await getChainMetadataRpc(chainId, blockHash)

  const registry = new TypeRegistry()
  const metadata: Metadata = new Metadata(registry, chainMetadataRpc.metadataRpc)
  metadata.registry.setMetadata(metadata)

  return { registry, chainMetadataRpc }
}
