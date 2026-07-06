import { Metadata, TypeRegistry } from "@polkadot/types"
import { hexToNumber, isHexString } from "@talismn/util"

import { getMetadataFromDef, getMetadataRpcFromDef } from "../domains/metadata/helpers"
import { chaindataProvider } from "../rpcs/chaindata"
import { getMetadataDef } from "./getMetadataDef"

// metadata may have been added manually to the store, for a chain that Talisman doesn't know about (not in chaindata)
// => use either chainId or genesisHash as identifier

/**
 *
 * @param chainIdOrHash chainId or genesisHash
 * @param specVersion specVersion of the metadata to be loaded (if not defined, will fetch latest)
 * @param blockHash if specVersion isn't specified, this is the blockHash where to fetch the correct metadata from (if not defined, will fetch latest)
 * @param signedExtensions signedExtensions from a transaction payload that has to be decoded or signed
 * @returns substrate type registry
 */
export const getTypeRegistry = async (
  chainIdOrHash: string,
  specVersion?: number | string,
  signedExtensions?: string[]
) => {
  const registry = new TypeRegistry()

  // TODO remove type override once chaindata-provider is fixed
  const chain = await (isHexString(chainIdOrHash)
    ? chaindataProvider.getNetworkByGenesisHash(chainIdOrHash)
    : chaindataProvider.getNetworkById(chainIdOrHash, "polkadot"))

  if (chain?.registryTypes) registry.register(chain.registryTypes)

  const numSpecVersion = typeof specVersion === "string" ? hexToNumber(specVersion) : specVersion
  const metadataDef = await getMetadataDef(chainIdOrHash, numSpecVersion)
  const metadataRpc = metadataDef ? getMetadataRpcFromDef(metadataDef) : undefined

  if (metadataDef) {
    const metadataValue = getMetadataFromDef(metadataDef)
    if (metadataValue) {
      const metadata: Metadata = new Metadata(registry, metadataValue)
      registry.setMetadata(metadata)
    }

    if (signedExtensions || metadataDef.userExtensions || chain?.signedExtensions)
      registry.setSignedExtensions(signedExtensions, {
        ...metadataDef.userExtensions,
        ...chain?.signedExtensions,
      })

    if (!metadataDef.metadataRpc && metadataDef.types) registry.register(metadataDef.types)
  } else if (signedExtensions || chain?.signedExtensions) {
    registry.setSignedExtensions(signedExtensions, chain?.signedExtensions)
  }

  return { registry, metadataRpc }
}
