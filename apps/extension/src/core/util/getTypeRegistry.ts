import { getMetadataRpc } from "@core/util/getMetadataRpc"
import { Metadata, TypeRegistry } from "@polkadot/types"

export const getTypeRegistry = async (chainId: string, blockHash?: string) => {
  const metadataRpc = await getMetadataRpc(chainId, blockHash)

  const registry = new TypeRegistry()
  const metadata: Metadata = new Metadata(registry, metadataRpc)
  metadata.registry.setMetadata(metadata)

  return registry
}
