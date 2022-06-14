import blake2Concat from "@talisman/util/blake2Concat"
import hasOwnProperty from "@talisman/util/hasOwnProperty"
import RpcFactory from "@core/libs/RpcFactory"
import { chainStore } from "@core/domains/chains"
import { tokenStore } from "@core/domains/tokens"
import { decodeAnyAddress } from "@core/util"
import twox64Concat from "@talisman/util/twox64Concat"
import { TypeRegistry, createType } from "@polkadot/types"
import {
  Address,
  AddressesByChain,
  Balance,
  Balances,
  Chain,
  ChainId,
  SubscriptionCallback,
  OrmlToken,
  UnsubscribeFn,
} from "@core/types"
import * as Sentry from "@sentry/browser"
import { DEBUG } from "@core/constants"
import { db } from "@core/libs/db"

// Tokens.Account is the state_storage key prefix for orml tokens
const moduleHash = "99971b5749ac43e0235e41b0d3786918" // xxhashAsHex("Tokens", 128).replace("0x", "")
const storageHash = "8ee7418a6531173d60d1f6a82d8f4d51" // xxhashAsHex("Accounts", 128).replace("0x", "")
const moduleStorageHash = `${moduleHash}${storageHash}`

const AccountData = JSON.stringify({ free: "u128", reserved: "u128", frozen: "u128" })

const registry = new TypeRegistry()

// TODO: Check if we really need to fetch chain from chaindata in here or not!
export default class OrmlTokensRpc {
  /**
   * Fetch or subscribe to tokens by chainIds and addresses.
   *
   * @param addressesByChain - Object with chainIds as keys, and arrays of addresses as values
   * @param callback - Optional subscription callback.
   * @returns Either `Balances`, or an unsubscribe function if the `callback` parameter was given.
   */
  static async tokens(addressesByChain: AddressesByChain): Promise<Balances>
  static async tokens(
    addressesByChain: AddressesByChain,
    callback: SubscriptionCallback<Balances>
  ): Promise<UnsubscribeFn>
  static async tokens(
    addressesByChain: AddressesByChain,
    callback?: SubscriptionCallback<Balances>
  ): Promise<Balances | UnsubscribeFn> {
    // subscription request
    if (callback !== undefined) {
      // subscribe to tokens
      const subscriptionPromises = Object.entries(addressesByChain).map(([chainId, addresses]) =>
        this.subscribeTokens(chainId, addresses, callback)
      )

      // return unsubscribe function
      return () =>
        subscriptionPromises.forEach((promise) => promise.then((unsubscribe) => unsubscribe()))
    }

    // once-off request
    return (
      await Promise.all(
        Object.entries(addressesByChain).map(([chainId, addresses]) =>
          this.fetchTokens(chainId, addresses)
        )
      )
    ).reduce((allBalances, chainBalances) => allBalances.add(chainBalances), new Balances([]))
  }

  /**
   * Subscribe to tokens on one chain by chainId and addresses.
   *
   * @param chainId - The chain to query tokens from.
   * @param addresses - The addresses to query tokens for.
   * @param callback - The subscription callback.
   * @returns The unsubscribe function.
   */
  private static async subscribeTokens(
    chainId: ChainId,
    addresses: Address[],
    callback: SubscriptionCallback<Balances>
  ): Promise<UnsubscribeFn> {
    const chain = await db.chains.get(chainId)
    if (!chain) throw new Error(`Chain ${chainId} not found in store`)
    if (!chain.tokens) return () => {}
    const tokens = (await db.tokens.bulkGet(chain.tokens.map(({ id }) => id))).filter(
      (token): token is OrmlToken => token !== undefined && token.type === "orml"
    )

    // set up method, return message type and params
    const subscribeMethod = "state_subscribeStorage" // method we call to subscribe
    const responseMethod = "state_storage" // type of message we expect to receive for each subscription update
    const unsubscribeMethod = "state_unsubscribeStorage" // method we call to unsubscribe
    const params = this.buildParams(addresses, chain.tokensCurrencyIdIndex, tokens)

    // build lookup table of `rpc hex output` -> `input address`
    const references = this.buildReferences(addresses, chain.tokensCurrencyIdIndex, tokens)

    // set up subscription
    const unsubscribe = await RpcFactory.subscribe(
      chainId,
      subscribeMethod,
      unsubscribeMethod,
      responseMethod,
      params,
      (error, result) => {
        if (error) return callback(error)
        callback(null, this.formatRpcResult(chain, tokens, references, result))
      }
    )

    return unsubscribe
  }

  /**
   * Fetch tokens from one chain by chainId and addresses.
   *
   * @param chainId - The chain to query tokens from.
   * @param addresses - The addresses to query tokens for.
   * @returns The fetched tokens as a `TokenList`.
   */
  private static async fetchTokens(chainId: ChainId, addresses: Address[]): Promise<Balances> {
    const chain = await db.chains.get(chainId)
    if (!chain) throw new Error(`Chain ${chainId} not found in store`)
    if (!chain.tokens) return new Balances([])
    const tokens = (await db.tokens.bulkGet(chain.tokens.map(({ id }) => id))).filter(
      (token): token is OrmlToken => token !== undefined && token.type === "orml"
    )

    // set up method and params
    const method = "state_queryStorageAt" // method we call to fetch
    const params = this.buildParams(addresses, chain.tokensCurrencyIdIndex, tokens)

    // build lookup table of `rpc hex output` -> `input address`
    const references = this.buildReferences(addresses, chain.tokensCurrencyIdIndex, tokens)

    // query rpc
    const response = await RpcFactory.send(chainId, method, params)
    const result = response[0]

    return this.formatRpcResult(chain, tokens, references, result)
  }

  /**
   * Turns an array of addresses into the params argument expected by `state_subscribeStorage` / `state_getStorage` / `state_queryStorageAt`.
   *
   * @param addresses - The addresses to query.
   * @returns The params to be sent to the RPC.
   */
  private static buildParams(
    addresses: Address[],
    tokensCurrencyIdIndex: number | null,
    tokens: OrmlToken[]
  ): string[][] {
    return [
      tokens
        .map(({ index: tokenIndex }) =>
          twox64Concat(new Uint8Array([tokensCurrencyIdIndex || 0, tokenIndex])).replace("0x", "")
        )
        .flatMap((tokenHash) =>
          addresses
            .map((address) => decodeAnyAddress(address))
            .map((addressBytes) => blake2Concat(addressBytes).replace("0x", ""))
            .map((addressHash) => `0x${moduleStorageHash}${addressHash}${tokenHash}`)
        ),
    ]
  }

  /**
   * Turns an array of addresses into a lookup table of `[address, reference]`.
   *
   * This lookup table is used to associate each balance in the RPC response with
   * the account which has that balance.
   *
   * @param addresses - The addresses which will be queried.
   * @returns The lookup table.
   *
   * @example An example of a lookup table returned by this function.
   * ```ts
   * [
   *   [
   *     // The address encoded in ss58 format
   *     "5EHNsSHuWrNMYgx3bPhsRVLG77DX8sS8wZrnbtieJzbtSZr9",
   *     // The address encoded in hexadecimal format
   *     "6222bdf686960b8ee8aeda225d885575c2238f0403003983b392cde500aeb06c"
   *   ]
   * ]
   * ```
   */
  private static buildReferences(
    addresses: Address[],
    tokensCurrencyIdIndex: number | null,
    tokens: OrmlToken[]
  ): Array<[string, number, string]> {
    return tokens
      .map(({ index: tokenIndex }): [number, string] => [
        tokenIndex,
        twox64Concat(new Uint8Array([tokensCurrencyIdIndex || 0, tokenIndex])).replace("0x", ""),
      ])
      .flatMap(([index, tokenHash]) =>
        addresses
          .map((address): [string, Uint8Array] => [address, decodeAnyAddress(address)])
          .map(([address, addressBytes]): [string, string] => [
            address,
            blake2Concat(addressBytes).replace("0x", ""),
          ])
          .map(([address, addressHash]): [string, number, string] => [
            address,
            index,
            `0x${moduleStorageHash}${addressHash}${tokenHash}`,
          ])
      )
  }

  /**
   * Formats an RPC result into a collection of Balances.
   *
   * @param chain - The chain which this result came from.
   * @param addressReferences - A lookup table for linking each balance to an `Address`.
   *                            Can be built with `BalancesRpc.buildAddressReferences`.
   * @param result - The result returned by the RPC.
   * @returns A formatted list of balances.
   */
  private static formatRpcResult(
    chain: Chain,
    tokens: OrmlToken[],
    references: Array<[string, number, string]>,
    result: unknown
  ): Balances {
    if (typeof result !== "object" || result === null) return new Balances([])
    if (!hasOwnProperty(result, "changes") || typeof result.changes !== "object")
      return new Balances([])
    if (!Array.isArray(result.changes)) return new Balances([])

    const balances = result.changes
      .map(([reference, change]: [unknown, unknown]): Balance | false => {
        if (typeof reference !== "string") {
          Sentry.captureMessage(`Received non-string reference in RPC result : ${reference}`)
          return false
        }

        if (typeof change !== "string" && change !== null) {
          Sentry.captureMessage(
            `Received non-string and non-null change in RPC result : ${reference}`
          )
          return false
        }

        const [address, tokenIndex] = references.find(([, , hex]) => reference === hex) || []
        if (address === undefined || tokenIndex === undefined) {
          const search = reference
          const set = references.map(([, , reference]) => reference).join(",\n")
          // eslint-disable-next-line no-console
          DEBUG && console.error(`Failed to find address + tokenIndex:\n${search} in \n${set}`)
          Sentry.captureMessage(`Failed to find address + tokenIndex \n${search} in \n${set}`)
          return false
        }

        const token = tokens.find(({ index }) => index === tokenIndex)
        if (!token) {
          Sentry.captureMessage(
            `Failed to find token for chain ${chain.id} tokenIndex ${tokenIndex}`
          )
          return false
        }

        const balance: any = createType(registry, AccountData, change)

        const free = (balance.free.toBigInt() || BigInt("0")).toString()
        const reserved = (balance.reserved.toBigInt() || BigInt("0")).toString()
        const frozen = (balance.frozen.toBigInt() || BigInt("0")).toString()

        return new Balance({
          pallet: "orml-tokens",

          status: "live",

          address,
          chainId: chain.id,
          tokenId: token.id,

          free,
          reserved,
          frozen,
        })
      })
      .filter((balance): balance is Balance => Boolean(balance))

    return new Balances(balances)
  }
}
