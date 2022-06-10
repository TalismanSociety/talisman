import { Balance, Balances } from "@core/domains/balances/types"
import { getProviderForEvmNetworkId } from "@core/domains/ethereum/networksStore"
import {
  Address,
  AddressesByChain,
  EvmNetwork,
  EvmNetworkId,
  SubscriptionCallback,
  UnsubscribeFn,
} from "@core/types"
import { JsonRpcProvider } from "@ethersproject/providers"

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
          const providers: { [evmNetworkId: EvmNetworkId]: JsonRpcProvider } = Object.fromEntries(
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
            await Promise.all(
              evmNetworks
                .filter(({ nativeToken }) => typeof nativeToken?.id === "string")
                .flatMap((evmNetwork) =>
                  addresses.map(
                    async (address) =>
                      new Balance({
                        pallet: "balances",

                        status: "live",

                        address: address,
                        evmNetworkId: evmNetwork.id,
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
