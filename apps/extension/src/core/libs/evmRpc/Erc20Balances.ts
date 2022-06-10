import { Balance, Balances } from "@core/domains/balances/types"
import { getProviderForEvmNetworkId } from "@core/domains/ethereum/networksStore"
import erc20Abi from "@core/libs/evmRpc/abis/erc20.json"
import {
  Address,
  Addresses,
  AddressesByChain,
  Erc20Token,
  EvmNetworkId,
  SubscriptionCallback,
  UnsubscribeFn,
} from "@core/types"
import { JsonRpcProvider } from "@ethersproject/providers"
import { ethers } from "ethers"

export default class Erc20BalancesEvmRpc {
  /**
   * Fetch or subscribe to balances by account addresses, evmNetworkIds and contract addresses.
   *
   * @param addresses - Accounts to fetch balances for.
   * @param tokensByEvmNetwork - Tokens by evm network to fetch balances for.
   * @param callback - Optional subscription callback.
   * @returns Either `Balances`, or an unsubscribe function if the `callback` parameter was given.
   */
  static async balances(
    addresses: Address[],
    tokensByEvmNetwork: {
      [evmNetworkId: EvmNetworkId]: Array<Pick<Erc20Token, "id" | "contractAddress">>
    }
  ): Promise<Balances>
  static async balances(
    addresses: Address[],
    tokensByEvmNetwork: {
      [evmNetworkId: EvmNetworkId]: Array<Pick<Erc20Token, "id" | "contractAddress">>
    },
    callback: SubscriptionCallback<Balances>
  ): Promise<UnsubscribeFn>
  static async balances(
    addresses: Address[],
    tokensByEvmNetwork: {
      [evmNetworkId: EvmNetworkId]: Array<Pick<Erc20Token, "id" | "contractAddress">>
    },
    callback?: SubscriptionCallback<Balances>
  ): Promise<Balances | UnsubscribeFn> {
    // subscription request
    if (callback !== undefined) {
      setTimeout(async () => {
        try {
          const providers: { [evmNetworkId: EvmNetworkId]: JsonRpcProvider } = Object.fromEntries(
            await Promise.all(
              Object.keys(tokensByEvmNetwork).map((evmNetworkId) =>
                getProviderForEvmNetworkId(Number(evmNetworkId)).then((provider) => [
                  evmNetworkId,
                  provider,
                ])
              )
            )
          )

          // TODO: Fetch on a timer while subscription is active
          const balances = new Balances(
            await Promise.all(
              Object.entries(tokensByEvmNetwork).flatMap(([evmNetworkId, tokens]) =>
                (tokens || []).flatMap((token) => {
                  const contract = new ethers.Contract(
                    token.contractAddress,
                    erc20Abi,
                    providers[Number(evmNetworkId)]
                  )
                  return addresses.map(
                    async (address) =>
                      new Balance({
                        pallet: "erc20",
                        status: "live",
                        address,
                        evmNetworkId: Number(evmNetworkId),
                        tokenId: token.id,
                        free: (
                          (await contract.balanceOf(address)).toBigInt() || BigInt("0")
                        ).toString(),
                      })
                  )
                })
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
