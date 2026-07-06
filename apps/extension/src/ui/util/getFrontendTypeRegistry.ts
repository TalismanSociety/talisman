import { getMetadataFromDef, getMetadataRpcFromDef } from "@core/domains/metadata/helpers"
import { Metadata, TypeRegistry } from "@polkadot/types"
import type { DotNetwork } from "@talismn/chaindata-provider"
import { type HexString, hexToNumber } from "@talismn/util"
import { api } from "@ui/api"

/**
 * do not reuse getTypeRegistry because we're on frontend, we need to leverage backend's metadata cache
 */
export const getFrontendTypeRegistry = async (
  network?: DotNetwork,
  specVersion?: number | string,
  signedExtensions?: string[]
) => {
  const registry = new TypeRegistry()

  const genesisHash = network?.genesisHash as HexString

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
