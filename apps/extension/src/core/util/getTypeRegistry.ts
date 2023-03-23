import { chaindataProvider } from "@core/rpcs/chaindata"
import { getMetadataDef, getMetadataFromDef } from "@core/util/getMetadataDef"
import { typesBundle } from "@polkadot/apps-config/api"
import { allNetworks as substrateSS58Registry } from "@polkadot/networks"
import { TypeRegistry } from "@polkadot/types"
import { getSpecTypes } from "@polkadot/types-known/util"
import { hexToNumber, isHex } from "@polkadot/util"
import { ChainProperties, GetRegistryOptsCore, getRegistryBase } from "@substrate/txwrapper-core"

/**
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
  const chain = await (isHex(chainIdOrHash)
    ? chaindataProvider.getChain({ genesisHash: chainIdOrHash })
    : chaindataProvider.getChain(chainIdOrHash))

  const numSpecVersion = typeof specVersion === "string" ? hexToNumber(specVersion) : specVersion
  const metadataDef = await getMetadataDef(chainIdOrHash, numSpecVersion, blockHash)
  const metadataRpc = metadataDef ? getMetadataFromDef(metadataDef) : undefined
  const userExtensions = metadataDef?.userExtensions

  // for chains using metadata < v14, we need a registry which has been loaded with the legacy typesBundle
  // for chains using metadata >= v14, we need a registry which has been loaded with the metadataRpc/metaCalls types
  const registry = metadataRpc
    ? getRegistry({
        chainName: chain?.chainName ?? "",
        specName: chain?.specName ?? "",
        specVersion: parseInt(chain?.specVersion ?? "0") ?? 0,
        metadataRpc,
        signedExtensions,
        userExtensions,
      })
    : new TypeRegistry()

  return { registry, metadataRpc }
}

/**
 * Create a registry based on specName, chainName, specVersion and metadataRpc. This should work for
 * Polkadot, Kusama, Westend and any chain which has up-to-date types in @polkadot/apps-config.
 *
 * @param GetRegistryOptions specName, chainName, specVersion, and metadataRpc of the current runtime
 */
function getRegistry({
  chainName,
  specName,
  specVersion,
  metadataRpc,
  properties,
  asCallsOnlyArg,
  signedExtensions,
  userExtensions,
}: GetRegistryOptsCore): TypeRegistry {
  const registry = new TypeRegistry()
  registry.setKnownTypes({ typesBundle })

  return getRegistryBase({
    chainProperties: properties ?? knownChainProperties[specName],
    // `getSpecTypes` is used to extract the chain specific types from the registry's `knownTypes`
    specTypes: getSpecTypes(registry, chainName, specName, specVersion),
    metadataRpc,
    asCallsOnlyArg,
    signedExtensions,
    userExtensions,
  })
}

/**
 * Known chain properties based on the substrate ss58 registry.
 * Chain properties are derived from the substrate ss58 registry:
 * https://raw.githubusercontent.com/paritytech/substrate/master/ss58-registry.json
 *
 * Alternatively, chain properties can be dynamically fetched through the
 * `system_properties` RPC call.
 */
const knownChainProperties = Object.fromEntries(
  substrateSS58Registry
    .filter(({ network }) => network !== null)
    .map<[string, ChainProperties]>(({ network, decimals, symbols, prefix }) => [
      network,
      { tokenDecimals: decimals, tokenSymbol: symbols, ss58Format: prefix },
    ])
)
