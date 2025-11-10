import { isEthereumAddress } from "@talismn/crypto"

import log from "../log"
import { Config, OnChainIds } from "./types"

/**
 * Looks up the on-chain identifiers for some addresses.
 * Supports ENS.
 */
export const lookupAddresses = async (config: Config, addresses: string[]): Promise<OnChainIds> => {
  const onChainIds: OnChainIds = new Map(addresses.map((address) => [address, null]))

  const [ensDomains] = await Promise.all([
    lookupEnsAddresses(config, addresses),
    // add more providers here
  ])

  ensDomains.forEach((domain, address) => {
    if (!domain) return
    onChainIds.set(address, domain)
  })

  return onChainIds
}

/**
 * Looks up the on-chain AZNS domains for some addresses.
 * @deprecated
 */
export const lookupAznsAddresses = async (
  config: Config,
  addresses: string[],
): Promise<OnChainIds> => {
  return new Promise<OnChainIds>((resolve) =>
    resolve(new Map(addresses.map((address) => [address, null]))),
  )
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
        const errorMessage = (cause as { shortMessage?: string })?.shortMessage ?? String(cause)
        throw new Error(`Failed to resolve ENS domain for address '${address}': ${errorMessage}`)
      }
    }),
  )
  results.forEach((result) => result.status === "rejected" && log.warn(result.reason.message))

  return onChainIds
}
