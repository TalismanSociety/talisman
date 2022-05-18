import RpcFactory from "@core/libs/RpcFactory"
import { getRegistry } from "@substrate/txwrapper-polkadot"
import { getMetadaRpc } from "./getMetadaRpc"
import { getRuntimeVersion } from "./getRuntimeVersion"

export const getTypeRegistry = async (chainId: string, blockHash?: string) => {
  const [chainName, properties, runtimeVersion, metadataRpc] = await Promise.all([
    RpcFactory.send(chainId, "system_chain", []),
    RpcFactory.send(chainId, "system_properties", []),
    getRuntimeVersion(chainId, blockHash),
    getMetadaRpc(chainId, blockHash),
  ])

  // type mismatch but compatible
  const { specName, specVersion } = runtimeVersion as any

  return getRegistry({
    specName,
    specVersion,
    metadataRpc,
    chainName,
    properties,
  })
}
