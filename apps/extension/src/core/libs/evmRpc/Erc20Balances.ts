import { DEBUG } from "@core/constants"
import { Balance, Balances } from "@core/domains/balances/types"
import { getProviderForEvmNetworkId } from "@core/domains/ethereum/networksStore"
import erc20Abi from "@core/libs/evmRpc/abis/erc20.json"
import { Address, Erc20Token, EvmNetworkId, SubscriptionCallback, UnsubscribeFn } from "@core/types"
import { JsonRpcBatchProvider } from "@ethersproject/providers"
import * as Sentry from "@sentry/browser"
import { ethers } from "ethers"

export default class Erc20BalancesEvmRpc {
  /**
   * Fetch or subscribe to erc20 token balances by account addresses, evmNetworkIds and contract addresses.
   *
   * @param addresses - Accounts to fetch balances for.
   * @param tokensByEvmNetwork - Tokens by evm network to fetch balances for.
   * @param callback - Optional subscription callback.
   * @returns Either `Balances`, or an unsubscribe function if the `callback` parameter was given.
   */
  static async balances(
    addresses: Address[],
    tokensByEvmNetwork: Record<EvmNetworkId, Array<Pick<Erc20Token, "id" | "contractAddress">>>
  ): Promise<Balances>
  static async balances(
    addresses: Address[],
    tokensByEvmNetwork: Record<EvmNetworkId, Array<Pick<Erc20Token, "id" | "contractAddress">>>,
    callback: SubscriptionCallback<Balances>
  ): Promise<UnsubscribeFn>
  static async balances(
    addresses: Address[],
    tokensByEvmNetwork: Record<EvmNetworkId, Array<Pick<Erc20Token, "id" | "contractAddress">>>,
    callback?: SubscriptionCallback<Balances>
  ): Promise<Balances | UnsubscribeFn> {
    // subscription request
    if (callback !== undefined) {
      let subscriptionActive = true
      const subscriptionInterval = 6_000 // 6_000ms == 6 seconds

      const poll = async () => {
        if (!subscriptionActive) return

        try {
          const evmNetworkIds = Object.keys(tokensByEvmNetwork).map(Number)
          const providers = await this.getEvmNetworkProviders(evmNetworkIds)
          const balances = await this.fetchErc20Balances(addresses, tokensByEvmNetwork, providers)

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
    const evmNetworkIds = Object.keys(tokensByEvmNetwork).map(Number)
    const providers = await this.getEvmNetworkProviders(evmNetworkIds)
    return await this.fetchErc20Balances(addresses, tokensByEvmNetwork, providers)
  }

  private static async getEvmNetworkProviders(
    evmNetworkIds: EvmNetworkId[]
  ): Promise<Record<EvmNetworkId, JsonRpcBatchProvider>> {
    return Object.fromEntries(
      await Promise.all(
        evmNetworkIds.map((evmNetworkId) =>
          getProviderForEvmNetworkId(evmNetworkId).then((provider) => [evmNetworkId, provider])
        )
      )
    )
  }

  private static async fetchErc20Balances(
    addresses: Address[],
    tokensByEvmNetwork: Record<EvmNetworkId, Array<Pick<Erc20Token, "id" | "contractAddress">>>,
    providers: Record<EvmNetworkId, JsonRpcBatchProvider>
  ): Promise<Balances> {
    // filter evmNetworks
    const fetchNetworks = Object.entries(tokensByEvmNetwork)
      // evmNetworkId string to number
      .map(
        ([evmNetworkId, tokens]): [
          EvmNetworkId,
          Array<Pick<Erc20Token, "id" | "contractAddress">>
        ] => [Number(evmNetworkId), tokens]
      )
      // network has rpc provider
      .filter(
        ([evmNetworkId]) =>
          providers[evmNetworkId] !== null && providers[evmNetworkId] !== undefined
      )

    // fetch all balances
    const balanceRequests = fetchNetworks.flatMap(([evmNetworkId, tokens]) =>
      (tokens || []).flatMap((token) => {
        const contract = new ethers.Contract(
          token.contractAddress,
          erc20Abi,
          providers[evmNetworkId]
        )
        return addresses.map(
          async (address) =>
            new Balance({
              pallet: "erc20",
              status: "live",
              address,
              evmNetworkId: evmNetworkId,
              tokenId: token.id,
              free: await this.getFreeBalance(contract, address),
            })
        )
      })
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

  private static async getFreeBalance(
    contract: ethers.Contract,
    address: Address
  ): Promise<string> {
    return ((await contract.balanceOf(address)).toBigInt() || BigInt("0")).toString()
  }
}
