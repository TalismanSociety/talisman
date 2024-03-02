import { resolveDomainToAddress } from "@azns/resolver-core"
import { ApiPromise } from "@polkadot/api"

import log from "../log"
import { isPotentialAzns } from "./isPotentialAzns"
import { isPotentialEns } from "./isPotentialEns"
import { Config, ResolvedNames } from "./types"

export const resolveNames = async (config: Config, names: string[]): Promise<ResolvedNames> => {
  const resolvedNames: ResolvedNames = new Map(names.map((name) => [name, null]))

  const [aznsNames, ensNames] = await Promise.all([
    resolveAznsNames(config, names),
    resolveEnsNames(config, names),
  ])

  aznsNames.forEach((lookup, name) => {
    if (!lookup) return

    const [address, lookupType] = lookup
    if (!address) return

    resolvedNames.set(name, [address, lookupType])
  })

  ensNames.forEach((lookup, name) => {
    if (!lookup) return

    const [address, lookupType] = lookup
    if (!address) return

    resolvedNames.set(name, [address, lookupType])
  })

  return resolvedNames
}

/**
 * Looks up the addresses for some azns (azero.id) domains.
 */
export const resolveAznsNames = async (config: Config, names: string[]): Promise<ResolvedNames> => {
  const resolvedNames: ResolvedNames = new Map(names.map((name) => [name, null]))

  if (!config.chainConnectors.substrate) {
    log.warn(`Could not find Substrate chainConnector in OnChainId::resolveAznsNames`)
    return resolvedNames
  }

  const provider = config.chainConnectors.substrate.asProvider(config.chainIdAlephZero)
  const customApi = new ApiPromise({ provider, registry: config.registryAlephZero })
  await customApi.isReady

  const results = await Promise.allSettled(
    names.map(async (name) => {
      if (!isPotentialAzns(name)) return

      try {
        const result = await resolveDomainToAddress(name, {
          chainId: config.aznsSupportedChainIdAlephZero,
          customApi,
        })
        if (result.error) throw result.error

        const { address } = result
        address !== null && resolvedNames.set(name, [address, "azns"])
      } catch (cause) {
        throw new Error(`Failed to resolve address for azns domain '${name}'`, { cause })
      }
    })
  )
  results.forEach((result) => result.status === "rejected" && log.warn(result.reason))

  customApi.disconnect()

  return resolvedNames
}

/**
 * Looks up the addresses for some ens (ens.domains) domains.
 */
export const resolveEnsNames = async (config: Config, names: string[]): Promise<ResolvedNames> => {
  const resolvedNames: ResolvedNames = new Map(names.map((name) => [name, null]))

  const client = await config.chainConnectors.evm?.getPublicClientForEvmNetwork(
    config.networkIdEthereum
  )
  if (!client) {
    log.warn(`Could not find Ethereum client in OnChainId::resolveNames`)
    return resolvedNames
  }

  const results = await Promise.allSettled(
    names.map(async (name) => {
      if (!isPotentialEns(name)) return

      try {
        const address = await client.getEnsAddress({ name })
        address !== null && resolvedNames.set(name, [address, "ens"])
      } catch (cause) {
        throw new Error(`Failed to resolve address for ens domain '${name}'`, { cause })
      }
    })
  )
  results.forEach((result) => result.status === "rejected" && log.warn(result.reason))

  return resolvedNames
}
