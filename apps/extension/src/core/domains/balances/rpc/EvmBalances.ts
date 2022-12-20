import { Balance, Balances } from "@core/domains/balances/types"
import { getProviderForEvmNetworkId } from "@core/domains/ethereum/rpcProviders"
import { EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { log } from "@core/log"
import { SubscriptionCallback, UnsubscribeFn } from "@core/types"
import { Address } from "@core/types/base"
import { isEthereumAddress } from "@polkadot/util-crypto"
import * as Sentry from "@sentry/browser"
import md5 from "blueimp-md5"
import { ethers } from "ethers"

export default class NativeBalancesEvmRpc {
  /**
   * Fetch or subscribe to native token balances by account addresses and evmNetworkIds.
   *
   * @param addresses - Accounts to fetch balances for.
   * @param evmNetworks - Evm networks to fetch balances for.
   * @param callback - Optional subscription callback.
   * @returns Either `Balances`, or an unsubscribe function if the `callback` parameter was given.
   */
  static async balances(
    addresses: Address[],
    evmNetworks: Array<Pick<EvmNetwork, "id" | "nativeToken">>
  ): Promise<Balances>
  static async balances(
    addresses: Address[],
    evmNetworks: Array<Pick<EvmNetwork, "id" | "nativeToken">>,
    callback: SubscriptionCallback<Balances>
  ): Promise<UnsubscribeFn>
  static async balances(
    addresses: Address[],
    evmNetworks: Array<Pick<EvmNetwork, "id" | "nativeToken">>,
    callback?: SubscriptionCallback<Balances>
  ): Promise<Balances | UnsubscribeFn> {
    // subscription request
    if (callback !== undefined) {
      const subscription = { active: true }
      const subscriptionInterval = 6_000 // 6_000ms == 6 seconds
      const cache = new Map<number, string>()

      const poll = async () => {
        if (!subscription.active) return

        try {
          // check each network sequentially to prevent timeouts
          for (const evmNetwork of evmNetworks) {
            const balances = await this.fetchNativeBalances(addresses, [evmNetwork])

            // Don't call callback with balances which have not changed since the last poll.
            const hash = md5(JSON.stringify(balances.toJSON()))
            if (cache.get(evmNetwork.id) !== hash) {
              cache.set(evmNetwork.id, hash)
              callback(null, balances)
            }
          }
        } catch (error) {
          callback(error)
        } finally {
          setTimeout(poll, subscriptionInterval)
        }
      }

      setTimeout(poll, subscriptionInterval)

      return () => {
        subscription.active = false
      }
    }

    // once-off request
    return await this.fetchNativeBalances(addresses, evmNetworks)
  }

  private static async fetchNativeBalances(
    addresses: Address[],
    evmNetworks: Array<Pick<EvmNetwork, "id" | "nativeToken">>
  ): Promise<Balances> {
    const providers = await this.getEvmNetworkProviders(evmNetworks)

    // filter evmNetworks
    const fetchNetworks = evmNetworks
      // network has native token
      .filter(({ nativeToken }) => typeof nativeToken?.id === "string")
      // network has rpc provider
      .filter(({ id }) => providers[id] !== null && providers[id] !== undefined)

    // fetch all balances
    const balanceRequests = fetchNetworks.flatMap((evmNetwork) =>
      addresses.map(async (address) => {
        let free
        try {
          free = await this.getFreeBalance(providers[evmNetwork.id], address)
        } catch (error) {
          log.error("Error fetching EVM Balances", error)
          const chance = Math.random()
          if (chance > 0.9) {
            // only log 10% of cases, because this error could occur repeatedly
            Sentry.captureException(error, {
              extra: { evmNetworkId: evmNetwork.id, nativeToken: evmNetwork.nativeToken?.id },
            })
          }
          return false
        }

        return new Balance({
          pallet: "balances",
          status: "live",
          address: address,
          evmNetworkId: evmNetwork.id,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          tokenId: evmNetwork.nativeToken?.id!,
          free,
          reserved: "0",
          miscFrozen: "0",
          feeFrozen: "0",
        })
      })
    )

    // wait for balance fetches to complete
    const balanceResults = await Promise.allSettled(balanceRequests)

    // filter out errors
    const balances = balanceResults
      .map((result) => {
        if (!result) return null
        if (result.status === "rejected") {
          log.error(result.reason)
          return null
        }

        return result.value
      })
      .filter((balance): balance is Balance => balance !== null)

    // return to caller
    return new Balances(balances)
  }

  private static async getEvmNetworkProviders(
    evmNetworks: Array<Pick<EvmNetwork, "id" | "nativeToken">>
  ): Promise<Record<EvmNetworkId, ethers.providers.JsonRpcProvider>> {
    return Object.fromEntries(
      await Promise.all(
        evmNetworks.map((evmNetwork) =>
          getProviderForEvmNetworkId(evmNetwork.id, { batch: true }).then((provider) => [
            evmNetwork.id,
            provider,
          ])
        )
      )
    )
  }

  private static async getFreeBalance(
    provider: ethers.providers.JsonRpcProvider,
    address: Address
  ): Promise<string> {
    if (!isEthereumAddress(address)) return BigInt("0").toString()
    return ((await provider.getBalance(address)).toBigInt() || BigInt("0")).toString()
  }
}
