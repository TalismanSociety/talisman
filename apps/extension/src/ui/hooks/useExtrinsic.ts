import { Chain, isJsonPayload } from "@extension/core"
import { getMetadataFromDef, getMetadataRpcFromDef } from "@extension/core"
import { chaindataProvider } from "@extension/core"
import { getUserExtensionsByChainId } from "@extension/core/domains/metadata/userExtensions"
import { log } from "@extension/shared"
import { typesBundle } from "@polkadot/apps-config/api"
import { Metadata, TypeRegistry } from "@polkadot/types"
import { getSpecAlias, getSpecTypes } from "@polkadot/types-known/util"
import { SignerPayloadJSON, SignerPayloadRaw } from "@polkadot/types/types"
import { hexToNumber, isHex } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"

// do not reuse getTypeRegistry because we're on front-end, we need to leverage backend's metadata cache
const getFrontEndTypeRegistry = async (
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

const decodeExtrinsic = async (payload: SignerPayloadJSON) => {
  try {
    const { genesisHash, signedExtensions, specVersion: hexSpecVersion } = payload

    const { registry } = await getFrontEndTypeRegistry(
      genesisHash,
      hexToNumber(hexSpecVersion),
      undefined, // dapp may be using an RPC that is a block ahead our provder's RPC, do not specify payload's blockHash or it could throw
      signedExtensions
    )

    return registry.createType("Extrinsic", payload)
  } catch (err) {
    log.error("Failed to decode extrinsic", { err })
    throw err
  }
}

export const useExtrinsic = (payload?: SignerPayloadJSON | SignerPayloadRaw) => {
  return useQuery({
    queryKey: ["useExtrinsic", payload],
    queryFn: () => (payload && isJsonPayload(payload) ? decodeExtrinsic(payload) : null),
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retryOnMount: false,
    retry: 2,
  })
}
