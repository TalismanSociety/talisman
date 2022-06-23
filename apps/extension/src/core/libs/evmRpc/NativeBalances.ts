import { DEBUG } from "@core/constants"
import { Balance, Balances } from "@core/domains/balances/types"
import { getProviderForEvmNetworkId } from "@core/domains/ethereum/networksStore"
import { Address, EvmNetwork, EvmNetworkId, SubscriptionCallback, UnsubscribeFn } from "@core/types"
import { JsonRpcBatchProvider } from "@ethersproject/providers"
import * as Sentry from "@sentry/browser"

export default class NativeBalancesEvmRpc {
  /**
   * Fetch or subscribe to balances by chainIds, contract addresses and account addresses.
   *
   * @param addressesByChain - Object with chainIds as keys, and arrays of addresses as values
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
      setTimeout(async () => {
        try {
          const providers: { [evmNetworkId: EvmNetworkId]: JsonRpcBatchProvider } =
            Object.fromEntries(
              await Promise.all(
                evmNetworks.map((evmNetwork) =>
                  getProviderForEvmNetworkId(evmNetwork.id).then((provider) => [
                    evmNetwork.id,
                    provider,
                  ])
                )
              )
            )

          // TODO: Fetch on a timer while subscription is active
          const balances = new Balances(
            (
              await Promise.allSettled(
                evmNetworks
                  .filter(({ nativeToken }) => typeof nativeToken?.id === "string")
                  .filter(({ id }) => providers[id] !== null && providers[id] !== undefined)
                  .flatMap((evmNetwork) =>
                    addresses.map(
                      async (address) =>
                        new Balance({
                          pallet: "balances",

                          status: "live",

                          address: address,
                          evmNetworkId: evmNetwork.id,
                          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                          tokenId: evmNetwork.nativeToken?.id!,
                          free: (
                            (await providers[evmNetwork.id].getBalance(address)).toBigInt() ||
                            BigInt("0")
                          ).toString(),
                          reserved: "0",
                          miscFrozen: "0",
                          feeFrozen: "0",
                        })
                    )
                  )
              )
            )
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
          )

          callback(null, balances)
        } catch (error) {
          callback(error)
        }
      }, 0)

      return () => {}
    }

    throw new Error("Not implemented")
    return new Balances([])
  }
}
