import { DEBUG } from "@core/constants"
import { Balance, Balances } from "@core/domains/balances/types"
import { getProviderForEvmNetworkId } from "@core/domains/ethereum/rpcProviders"
import { EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { SubscriptionCallback, UnsubscribeFn } from "@core/types"
import { Address } from "@core/types/base"
import * as Sentry from "@sentry/browser"
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
      let subscriptionActive = true
      const subscriptionInterval = 6_000 // 6_000ms == 6 seconds

      const poll = async () => {
        if (!subscriptionActive) return

        try {
          const balances = await this.fetchNativeBalances(addresses, evmNetworks)

          // TODO: Don't call callback with balances which have not changed since the last poll.
          callback(null, balances)
        } catch (error) {
          callback(error)
        } finally {
          setTimeout(poll, subscriptionInterval)
        }
      }
      setTimeout(poll, subscriptionInterval)

      return () => {
        subscriptionActive = false
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
      addresses.map(
        async (address) =>
          new Balance({
            pallet: "balances",
            status: "live",
            address: address,
            evmNetworkId: evmNetwork.id,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            tokenId: evmNetwork.nativeToken?.id!,
            free: await this.getFreeBalance(providers[evmNetwork.id], address),
            reserved: "0",
            miscFrozen: "0",
            feeFrozen: "0",
          })
      )
    )

    // wait for balance fetches to complete
    const balanceResults = await Promise.allSettled(balanceRequests)

    // filter out errors
    const balances = balanceResults
      .map((result) => {
        if (result.status === "rejected") {
          // eslint-disable-next-line no-console
          DEBUG && console.error(result.reason)
          Sentry.captureException(result.reason)
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
    return ((await provider.getBalance(address)).toBigInt() || BigInt("0")).toString()
  }
}
