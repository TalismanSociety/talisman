import { throwAfter } from "@talismn/util"

import log from "../log"
import { resolveDomainToAddress } from "./aznsRouter"
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

  if (names.every((name) => !isPotentialAzns(name))) return resolvedNames

  if (!config.chainConnectors.substrate) {
    log.warn(`Could not find Substrate chainConnector in OnChainId::resolveAznsNames`)
    return resolvedNames
  }

  const provider = config.chainConnectors.substrate.asProvider(config.chainIdAlephZero)

  const results = await Promise.allSettled(
    names.map(async (name) => {
      if (!isPotentialAzns(name)) return

      const address = await resolveDomainToAddress(name, {
        chainId: config.aznsSupportedChainIdAlephZero,
        registry: config.registryAlephZero,
        provider,
      })

      if (address) resolvedNames.set(name, [address, "azns"])
    }),
  )
  results.forEach((result) => result.status === "rejected" && log.warn(result.reason))

  return resolvedNames
}

/**
 * Looks up the addresses for some ens (ens.domains) domains.
 */
export const resolveEnsNames = async (config: Config, names: string[]): Promise<ResolvedNames> => {
  const resolvedNames: ResolvedNames = new Map(names.map((name) => [name, null]))

  if (names.every((name) => !isPotentialEns(name))) return resolvedNames

  const client = await config.chainConnectors.evm?.getPublicClientForEvmNetwork(
    config.networkIdEthereum,
  )
  if (!client) {
    log.warn(`Could not find Ethereum client in OnChainId::resolveNames`)
    return resolvedNames
  }

  const results = await Promise.allSettled(
    names.map(async (name) => {
      if (!isPotentialEns(name)) return

      try {
        const address = await Promise.race([
          // this hangs forever in some cases (ex: try agyle.e first, then agyle.et => hangs) - couldn't explain it
          client.getEnsAddress({ name }),
          throwAfter(10_000, "Timeout"),
        ])
        address !== null && resolvedNames.set(name, [address, "ens"])
      } catch (cause) {
        throw new Error(`Failed to resolve address for ens domain '${name}'`, { cause })
      }
    }),
  )

  results.forEach((result) => result.status === "rejected" && log.warn(result.reason))

  return resolvedNames
}
