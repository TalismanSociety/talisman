import { Chain } from "@extension/core"
import { getUserExtensionsByChainId } from "@extension/core/domains/metadata/userExtensions"
import { getMetadataFromDef, getMetadataRpcFromDef } from "@extension/shared"
import { log } from "@extension/shared"
import { typesBundle } from "@polkadot/apps-config/api"
import { Metadata, TypeRegistry } from "@polkadot/types"
import { getSpecAlias, getSpecTypes } from "@polkadot/types-known/util"
import { hexToNumber, isHex } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { api } from "@ui/api"
import { chaindataProvider } from "@ui/domains/Chains/chaindataProvider"

/**
 * do not reuse getTypeRegistry because we're on frontend, we need to leverage backend's metadata cache
 */
export const getFrontendTypeRegistry = async (
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

  const genesisHash = (isHex(chainIdOrHash) ? chainIdOrHash : chain?.genesisHash) as HexString

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

  // metadata must be loaded by backend
  const metadataDef = await api.subChainMetadata(
    genesisHash,
    numSpecVersion,
    blockHash as HexString
  )

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
    if (metadataDef.types) registry.register(metadataDef.types)
  } else {
    registry.setSignedExtensions(signedExtensions, getUserExtensionsByChainId(chain?.id))
  }

  return { registry, metadataRpc }
}
