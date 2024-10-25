import { isEthereumAddress } from "@talismn/util"

import log from "../log"
import { resolveAddressToDomain } from "./aznsRouter"
import { Config, OnChainIds } from "./types"

/**
 * Looks up the on-chain identifiers for some addresses.
 * Supports ENS and AZNS.
 */
export const lookupAddresses = async (config: Config, addresses: string[]): Promise<OnChainIds> => {
  const onChainIds: OnChainIds = new Map(addresses.map((address) => [address, null]))

  const [aznsDomains, ensDomains] = await Promise.all([
    lookupAznsAddresses(config, addresses),
    lookupEnsAddresses(config, addresses),
  ])

  aznsDomains.forEach((domain, address) => {
    if (!domain) return
    onChainIds.set(address, domain)
  })

  ensDomains.forEach((domain, address) => {
    if (!domain) return
    onChainIds.set(address, domain)
  })

  return onChainIds
}

/**
 * Looks up the on-chain AZNS domains for some addresses.
 */
export const lookupAznsAddresses = async (
  config: Config,
  addresses: string[],
): Promise<OnChainIds> => {
  const onChainIds: OnChainIds = new Map(addresses.map((address) => [address, null]))

  if (!config.chainConnectors.substrate) {
    log.warn(`Could not find Substrate chainConnector in OnChainId::lookupAznsAddresses`)
    return onChainIds
  }

  const provider = config.chainConnectors.substrate.asProvider(config.chainIdAlephZero)

  const results = await Promise.allSettled(
    addresses.map(async (address) => {
      // no need to do AZNS lookup for ethereum addresses
      if (isEthereumAddress(address)) return

      const domain = await resolveAddressToDomain(address, {
        chainId: config.aznsSupportedChainIdAlephZero,
        registry: config.registryAlephZero,
        provider,
      })
      if (domain) onChainIds.set(address, domain)
    }),
  )
  results.forEach((result) => result.status === "rejected" && log.warn(result.reason))

  return onChainIds
}

/**
 * Looks up the on-chain ENS domains for some addresses.
 */
export const lookupEnsAddresses = async (
  config: Config,
  addresses: string[],
): Promise<OnChainIds> => {
  const onChainIds: OnChainIds = new Map(addresses.map((address) => [address, null]))

  const client = await config.chainConnectors.evm?.getPublicClientForEvmNetwork(
    config.networkIdEthereum,
  )
  if (!client) {
    log.warn(`Could not find Ethereum client in OnChainId::lookupEnsAddresses`)
    return onChainIds
  }

  const results = await Promise.allSettled(
    addresses.map(async (address) => {
      // no need to do ENS lookup for polkadot addresses
      if (!isEthereumAddress(address)) return

      try {
        const domain = await client.getEnsName({ address })
        domain !== null && onChainIds.set(address, domain)
      } catch (cause) {
        throw new Error(`Failed to resolve ENS domain for address '${address}': ${String(cause)}`, {
          cause,
        })
      }
    }),
  )
  results.forEach((result) => result.status === "rejected" && log.warn(result.reason))

  return onChainIds
}
