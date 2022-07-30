import { DEBUG } from "@core/constants"
import { Balance, Balances } from "@core/domains/balances/types"
import { getProviderForEvmNetworkId } from "@core/domains/ethereum/networksStore"
import { EvmNetworkId } from "@core/domains/ethereum/types"
import { Erc20Token } from "@core/domains/tokens/types"
import { SubscriptionCallback, UnsubscribeFn } from "@core/types"
import { Address } from "@core/types/base"
import * as Sentry from "@sentry/browser"
import { ethers } from "ethers"

import erc20Abi from "./abis/erc20.json"

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
          const balances = await this.fetchErc20Balances(addresses, tokensByEvmNetwork)

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
    return await this.fetchErc20Balances(addresses, tokensByEvmNetwork)
  }

  private static async fetchErc20Balances(
    addresses: Address[],
    tokensByEvmNetwork: Record<EvmNetworkId, Array<Pick<Erc20Token, "id" | "contractAddress">>>
  ): Promise<Balances> {
    const evmNetworkIds = Object.keys(tokensByEvmNetwork).map(Number)
    const providers = await this.getEvmNetworkProviders(evmNetworkIds)

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

  private static async getEvmNetworkProviders(
    evmNetworkIds: EvmNetworkId[]
  ): Promise<Record<EvmNetworkId, ethers.providers.JsonRpcProvider>> {
    return Object.fromEntries(
      await Promise.all(
        evmNetworkIds.map((evmNetworkId) =>
          getProviderForEvmNetworkId(evmNetworkId, true).then((provider) => [
            evmNetworkId,
            provider,
          ])
        )
      )
    )
  }

  private static async getFreeBalance(
    contract: ethers.Contract,
    address: Address
  ): Promise<string> {
    return ((await contract.balanceOf(address)).toBigInt() || BigInt("0")).toString()
  }
}
