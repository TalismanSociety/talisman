import RpcFactory from "@core/libs/RpcFactory"
import { Metadata, TypeRegistry } from "@polkadot/types"

import { getMetadataRpc } from "./getMetadataRpc"
import { getRuntimeVersion } from "./getRuntimeVersion"

export const getTypeRegistry = async (chainId: string, blockHash?: string) => {
  const metadataRpc = await getMetadataRpc(chainId, blockHash)

  const registry = new TypeRegistry()
  const metadata: Metadata = new Metadata(registry, metadataRpc)
  metadata.registry.setMetadata(metadata)

  return registry
}
