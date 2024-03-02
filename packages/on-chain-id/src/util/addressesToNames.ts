import { resolveAddressToDomain } from "@azns/resolver-core"
import { ApiPromise } from "@polkadot/api"
import { RpcStateQuery, RpcStateQueryHelper, StorageHelper } from "@talismn/balances"
import { decodeAnyAddress, isEthereumAddress } from "@talismn/util"

import log from "../log"
import { Config, OnChainIds } from "./types"

/**
 * Looks up the on-chain identifiers for some addresses.
 *
 * Prefers ENS, then AZNS, then falls back to Polkadot identities.
 *
 * Requires a TypeRegistry which has been instantiated on the Polkadot relay chain.
 * Talisman Wallet developers can build one by using `/apps/extension/src/core/util/getTypeRegistry.ts`.
 */
export const lookupAddresses = async (config: Config, addresses: string[]): Promise<OnChainIds> => {
  const onChainIds: OnChainIds = new Map(addresses.map((address) => [address, null]))

  const [/* polkadotIdentities, */ aznsDomains, ensDomains] = await Promise.all([
    // lookupPolkadotAddresses(config, addresses),
    lookupAznsAddresses(config, addresses),
    lookupEnsAddresses(config, addresses),
  ])

  // polkadotIdentities.forEach((polkadotIdentity, address) => {
  //   if (!polkadotIdentity) return
  //   onChainIds.set(address, polkadotIdentity)
  // })

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
 * Looks up the on-chain Polkadot identities for some addresses.
 *
 * Requires a TypeRegistry which has been instantiated on the Polkadot relay chain.
 * Talisman Wallet developers can build one by using `/apps/extension/src/core/util/getTypeRegistry.ts`.
 */
export const lookupPolkadotAddresses = async (
  config: Config,
  addresses: string[]
): Promise<OnChainIds> => {
  const onChainIds: OnChainIds = new Map(addresses.map((address) => [address, null]))

  if (!config.chainConnectors.substrate) {
    log.warn(`Could not find Substrate chainConnector in OnChainId::lookupPolkadotAddresses`)
    return onChainIds
  }

  const queries = addresses.flatMap((address): RpcStateQuery<[string, string | null]> | [] => {
    const storageHelper = new StorageHelper(
      config.registryPolkadot,
      "identity",
      "identityOf",
      decodeAnyAddress(address)
    )

    // filter out queries which we failed to encode (e.g. an invalid address was input)
    const stateKey = storageHelper.stateKey
    if (!stateKey) return []

    const decodeResult = (change: string | null): [string, string | null] => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decoded: any = storageHelper.decode(change)

      // explicit null is required here to ensure the frontend knows that the address has been queried
      const bytes = decoded?.value?.info?.display?.value
      const bytesDecoded = new TextDecoder().decode(bytes)

      const judgements: string[] =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        decoded?.value?.judgements?.flatMap?.((judgement: any) => {
          if (judgement?.[1]?.isErroneous) return "Erroneous"
          if (judgement?.[1]?.isFeePaid) return "FeePaid"
          if (judgement?.[1]?.isKnownGood) return "KnownGood"
          if (judgement?.[1]?.isLowQuality) return "LowQuality"
          if (judgement?.[1]?.isOutOfDate) return "OutOfDate"
          if (judgement?.[1]?.isReasonable) return "Reasonable"
          if (judgement?.[1]?.isUnknown) return "Unknown"

          log.warn(`Unknown judgement type ${judgement?.toJSON?.() ?? String(judgement)}`)
          return []
        }) ?? []
      if (judgements.length < 1) judgements.push("NoJudgement")

      const display = bytes ? `${bytesDecoded} (${judgements.join(", ")})` : null

      return [address, display]
    }

    return { chainId: config.chainIdPolkadot, stateKey, decodeResult }
  })

  const identities = await new RpcStateQueryHelper(
    config.chainConnectors.substrate,
    queries
  ).fetch()

  identities.forEach(([address, polkadotIdentity]) => {
    if (!polkadotIdentity) return
    onChainIds.set(address, polkadotIdentity)
  })

  return onChainIds
}

/**
 * Looks up the on-chain AZNS domains for some addresses.
 */
export const lookupAznsAddresses = async (
  config: Config,
  addresses: string[]
): Promise<OnChainIds> => {
  const onChainIds: OnChainIds = new Map(addresses.map((address) => [address, null]))

  if (!config.chainConnectors.substrate) {
    log.warn(`Could not find Substrate chainConnector in OnChainId::lookupAznsAddresses`)
    return onChainIds
  }

  const provider = config.chainConnectors.substrate.asProvider(config.chainIdAlephZero)
  const customApi = new ApiPromise({ provider, registry: config.registryAlephZero })
  await customApi.isReady

  const results = await Promise.allSettled(
    addresses.map(async (address) => {
      // no need to do AZNS lookup for ethereum addresses
      if (isEthereumAddress(address)) return

      try {
        const result = await resolveAddressToDomain(address, {
          chainId: config.aznsSupportedChainIdAlephZero,
          customApi,
        })
        if (result.error) throw result.error

        const { primaryDomain: domain } = result
        domain !== null && onChainIds.set(address, domain)
      } catch (cause) {
        throw new Error(
          `Failed to resolve AZNS domain for address '${address}': ${String(cause)}`,
          {
            cause,
          }
        )
      }
    })
  )
  results.forEach((result) => result.status === "rejected" && log.warn(result.reason))

  return onChainIds
}

/**
 * Looks up the on-chain ENS domains for some addresses.
 */
export const lookupEnsAddresses = async (
  config: Config,
  addresses: string[]
): Promise<OnChainIds> => {
  const onChainIds: OnChainIds = new Map(addresses.map((address) => [address, null]))

  const client = await config.chainConnectors.evm?.getPublicClientForEvmNetwork(
    config.networkIdEthereum
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
    })
  )
  results.forEach((result) => result.status === "rejected" && log.warn(result.reason))

  return onChainIds
}
