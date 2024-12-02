import { typesBundle } from "@polkadot/apps-config/api"
import { Metadata, TypeRegistry } from "@polkadot/types"
import { getSpecAlias, getSpecTypes } from "@polkadot/types-known/util"
import { hexToNumber } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"

import { Chain } from "@extension/core"
import { getMetadataFromDef, getMetadataRpcFromDef, log } from "@extension/shared"
import { api } from "@ui/api"

/**
 * do not reuse getTypeRegistry because we're on frontend, we need to leverage backend's metadata cache
 */
export const getFrontendTypeRegistry = async (
  chain?: Chain,
  specVersion?: number | string,
  blockHash?: string,
  signedExtensions?: string[],
) => {
  const registry = new TypeRegistry()

  const genesisHash = chain?.genesisHash as HexString

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
            parseInt(chain.specVersion ?? "0", 10) ?? 0,
          ),
        )
        registry.knownTypes.typesAlias = getSpecAlias(registry, chain.chainName, chain.specName)
      }
    }
  }

  if (chain?.registryTypes) registry.register(chain.registryTypes)

  const numSpecVersion = typeof specVersion === "string" ? hexToNumber(specVersion) : specVersion

  // metadata must be loaded by backend
  const metadataDef = await api.subChainMetadata(
    genesisHash,
    numSpecVersion,
    blockHash as HexString,
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
      ...chain?.signedExtensions,
    })

    if (metadataDef.types) registry.register(metadataDef.types)
  } else {
    registry.setSignedExtensions(signedExtensions, chain?.signedExtensions)
  }

  return { registry, metadataRpc }
}
