import { typesBundle } from "@polkadot/apps-config/api"
import { Metadata, TypeRegistry } from "@polkadot/types"
import { getSpecAlias, getSpecTypes } from "@polkadot/types-known/util"
import { hexToNumber } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { DotNetwork } from "@talismn/chaindata-provider"
import { getMetadataFromDef, getMetadataRpcFromDef } from "extension-core"

import { api } from "@ui/api"

/**
 * do not reuse getTypeRegistry because we're on frontend, we need to leverage backend's metadata cache
 */
export const getFrontendTypeRegistry = async (
  network?: DotNetwork,
  specVersion?: number | string,
  signedExtensions?: string[],
) => {
  const registry = new TypeRegistry()

  const genesisHash = network?.genesisHash as HexString

  // register typesBundle in registry for legacy (pre metadata v14) chains
  if (typesBundle.spec && network?.specName && typesBundle.spec[network.specName]) {
    const chainBundle =
      network.chainName && typesBundle.chain?.[network.chainName]
        ? { chain: { [network.chainName]: typesBundle.chain[network.chainName] } }
        : {}
    const specBundle =
      network.specName && typesBundle.spec?.[network.specName]
        ? { spec: { [network.specName]: typesBundle.spec[network.specName] } }
        : {}
    const legacyTypesBundle = { ...chainBundle, ...specBundle }

    if (legacyTypesBundle) {
      registry.clearCache()
      registry.setKnownTypes({ typesBundle: legacyTypesBundle })
      if (network.chainName) {
        registry.register(
          getSpecTypes(registry, network.chainName, network.specName, network.specVersion),
        )
        registry.knownTypes.typesAlias = getSpecAlias(registry, network.chainName, network.specName)
      }
    }
  }

  if (network?.registryTypes) registry.register(network.registryTypes)

  const numSpecVersion = typeof specVersion === "string" ? hexToNumber(specVersion) : specVersion

  // metadata must be loaded by backend
  const metadataDef = await api.subChainMetadata(genesisHash, numSpecVersion)

  const metadataRpc = metadataDef ? getMetadataRpcFromDef(metadataDef) : undefined

  if (metadataDef) {
    const metadataValue = getMetadataFromDef(metadataDef)
    if (metadataValue) {
      const metadata: Metadata = new Metadata(registry, metadataValue)
      registry.setMetadata(metadata)
    }

    if (signedExtensions || metadataDef.userExtensions || network?.signedExtensions)
      registry.setSignedExtensions(signedExtensions, {
        ...metadataDef.userExtensions,
        ...network?.signedExtensions,
      })

    if (metadataDef.types) registry.register(metadataDef.types)
  } else if (signedExtensions || network?.signedExtensions) {
    registry.setSignedExtensions(signedExtensions, network?.signedExtensions)
  }

  return { registry, metadataRpc }
}
