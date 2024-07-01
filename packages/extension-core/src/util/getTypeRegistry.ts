import { typesBundle } from "@polkadot/apps-config/api"
import { Metadata, TypeRegistry } from "@polkadot/types"
import { getSpecAlias, getSpecTypes } from "@polkadot/types-known/util"
import { hexToNumber, isHex } from "@polkadot/util"
import { Chain } from "@talismn/chaindata-provider"
import { getMetadataFromDef, getMetadataRpcFromDef, log } from "extension-shared"

import { getUserExtensionsByChainId } from "../domains/metadata/userExtensions"
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
  blockHash?: string,
  signedExtensions?: string[]
) => {
  const registry = new TypeRegistry()

  // TODO remove type override once chaindata-provider is fixed
  const chain = (await (isHex(chainIdOrHash)
    ? chaindataProvider.chainByGenesisHash(chainIdOrHash)
    : chaindataProvider.chainById(chainIdOrHash))) as Chain | null

  // register typesBundle in registry for legacy (pre metadata v14) chains
  if (typesBundle.spec && chain?.specName && typesBundle.spec[chain.specName]) {
    const chainBundle =
      chain.chainName && typesBundle.chain?.[chain.chainName]
        ? { chain: { [chain.chainName]: typesBundle.chain[chain.chainName] } }
        : {}
    const specBundle =
      chain.specName && typesBundle.spec?.[chain.specName]
        ? { spec: { [chain.specName]: typesBundle.spec[chain.specName] } }
        : {}
    const legacyTypesBundle = { ...chainBundle, ...specBundle }

    if (legacyTypesBundle) {
      log.debug(`Setting known types for chain ${chain.id}`)
      registry.clearCache()
      registry.setKnownTypes({ typesBundle: legacyTypesBundle })
      if (chain.chainName) {
        registry.register(
          getSpecTypes(
            registry,
            chain.chainName,
            chain.specName,
            parseInt(chain.specVersion ?? "0", 10) ?? 0
          )
        )
        registry.knownTypes.typesAlias = getSpecAlias(registry, chain.chainName, chain.specName)
      }
    }
  }

  const numSpecVersion = typeof specVersion === "string" ? hexToNumber(specVersion) : specVersion
  const metadataDef = await getMetadataDef(chainIdOrHash, numSpecVersion, blockHash)
  const metadataRpc = metadataDef ? getMetadataRpcFromDef(metadataDef) : undefined

  if (metadataDef) {
    const metadataValue = getMetadataFromDef(metadataDef)
    if (metadataValue) {
      const metadata: Metadata = new Metadata(registry, metadataValue)
      registry.setMetadata(metadata)
    }

    registry.setSignedExtensions(signedExtensions, {
      ...metadataDef.userExtensions,
      ...getUserExtensionsByChainId(chain?.id),
    })

    if (!metadataDef.metadataRpc && metadataDef.types) registry.register(metadataDef.types)
  } else {
    registry.setSignedExtensions(signedExtensions, getUserExtensionsByChainId(chain?.id))
  }

  return { registry, metadataRpc }
}
