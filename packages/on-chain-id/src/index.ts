import { TypeRegistry } from "@polkadot/types"
import { PromisePool } from "@supercharge/promise-pool"
import {
  ChainConnectors,
  RpcStateQuery,
  RpcStateQueryHelper,
  StorageHelper,
} from "@talismn/balances"
import { decodeAnyAddress, isEthereumAddress } from "@talismn/util"

import log from "./log"

export * from "./helpers"

export type OnChainIds = Map<string, string | null>

export class OnChainId {
  constructor(
    // TODO: Create a package for `/apps/extension/src/core/util/getTypeRegistry.ts` which
    // can be used from outside of the wallet.
    private polkadotRegistry: TypeRegistry,
    private chainConnectors: ChainConnectors,

    private chainIdPolkadot = "polkadot",
    private networkIdEthereum = "1"
  ) {}

  /**
   * Looks up the addresses for some ENS domains.
   */
  async resolveNames(names: string[]): Promise<Map<string, string | null>> {
    const resolvedNames = new Map<string, string | null>(names.map((name) => [name, null]))

    const provider = await this.chainConnectors.evm?.getProviderForEvmNetworkId(
      this.networkIdEthereum
    )
    if (!provider) {
      log.warn(`Could not find Ethereum provider in OnChainId::resolveNames`)
      return resolvedNames
    }

    const { errors } = await PromisePool.withConcurrency(3)
      .for(names)
      .process(async (name) => {
        try {
          const address = await provider.resolveName(name)
          name !== null && resolvedNames.set(name, address)
        } catch (cause) {
          throw new Error(`Failed to resolve address for ENS domain '${name}'`, { cause })
        }
      })

    errors.forEach((error) => log.warn(error))

    return resolvedNames
  }

  /**
   * Looks up the on-chain identifiers for some addresses.
   *
   * Prefers ENS, then falls back to Polkadot identities.
   *
   * Requires a TypeRegistry which has been instantiated on the Polkadot relay chain.
   * Talisman Wallet developers can build one by using `/apps/extension/src/core/util/getTypeRegistry.ts`.
   */
  async lookupAddresses(addresses: string[]): Promise<OnChainIds> {
    const onChainIds: OnChainIds = new Map(addresses.map((address) => [address, null]))

    const [polkadotIdentities, ensDomains] = await Promise.all([
      this.lookupPolkadotAddresses(addresses),
      this.lookupEnsAddresses(addresses),
    ])

    polkadotIdentities.forEach((polkadotIdentity, address) => {
      if (!polkadotIdentity) return
      onChainIds.set(address, polkadotIdentity)
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
  async lookupPolkadotAddresses(addresses: string[]): Promise<OnChainIds> {
    const onChainIds: OnChainIds = new Map(addresses.map((address) => [address, null]))

    if (!this.chainConnectors.substrate) {
      log.warn(`Could not find Substrate chainConnector in OnChainId::lookupPolkadotAddresses`)
      return onChainIds
    }

    const queries = addresses.flatMap((address): RpcStateQuery<[string, string | null]> | [] => {
      const storageHelper = new StorageHelper(
        this.polkadotRegistry,
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

      return { chainId: this.chainIdPolkadot, stateKey, decodeResult }
    })

    const identities = await new RpcStateQueryHelper(
      this.chainConnectors.substrate,
      queries
    ).fetch()

    identities.forEach(([address, polkadotIdentity]) => {
      if (!polkadotIdentity) return
      onChainIds.set(address, polkadotIdentity)
    })

    return onChainIds
  }

  /**
   * Looks up the on-chain ENS domains for some addresses.
   */
  async lookupEnsAddresses(addresses: string[]): Promise<OnChainIds> {
    const onChainIds: OnChainIds = new Map(addresses.map((address) => [address, null]))

    const provider = await this.chainConnectors.evm?.getProviderForEvmNetworkId(
      this.networkIdEthereum
    )
    if (!provider) {
      log.warn(`Could not find Ethereum provider in OnChainId::lookupEnsAddresses`)
      return onChainIds
    }

    const { errors } = await PromisePool.withConcurrency(3)
      .for(addresses)
      .process(async (address) => {
        // no need to do ENS lookup for polkadot addresses
        if (!isEthereumAddress(address)) return

        try {
          const domain = await provider.lookupAddress(address)
          domain !== null && onChainIds.set(address, domain)
        } catch (cause) {
          throw new Error(
            `Failed to resolve ENS domain for address '${address}': ${String(cause)}`,
            { cause }
          )
        }
      })

    errors.forEach((error) => log.warn(error))

    return onChainIds
  }
}
