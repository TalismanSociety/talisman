import { DEBUG } from "@core/constants"
import { Balance, Balances } from "@core/domains/balances/types"
import { Chain, ChainId } from "@core/domains/chains/types"
import { db } from "@core/libs/db"
import RpcFactory from "@core/libs/RpcFactory"
import { SubscriptionCallback, UnsubscribeFn } from "@core/types"
import { Address, AddressesByChain } from "@core/types/base"
import { decodeAnyAddress } from "@core/util"
import { TypeRegistry, createType } from "@polkadot/types"
import { u8aToHex } from "@polkadot/util"
import * as Sentry from "@sentry/browser"
import blake2Concat from "@talisman/util/blake2Concat"
import hasOwnProperty from "@talisman/util/hasOwnProperty"

// System.Account is the state_storage key prefix for nativeToken balances
const moduleHash = "26aa394eea5630e07c48ae0c9558cef7" // util_crypto.xxhashAsHex("System", 128);
const storageHash = "b99d880ec681799c0cf30e8886371da9" // util_crypto.xxhashAsHex("Account", 128);
const moduleStorageHash = `${moduleHash}${storageHash}`

// AccountInfo is the state_storage data format for nativeToken balances
const AccountInfo = JSON.stringify({
  nonce: "u32",
  consumers: "u32",
  providers: "u32",
  sufficients: "u32",
  data: { free: "u128", reserved: "u128", miscFrozen: "u128", feeFrozen: "u128" },
})
const AccountInfoCommonOverides = {
  noSufficients: JSON.stringify({
    nonce: "u32",
    consumers: "u32",
    providers: "u32",
    data: { free: "u128", reserved: "u128", miscFrozen: "u128", feeFrozen: "u128" },
  }),
  u64Nonce: JSON.stringify({
    nonce: "u64",
    consumers: "u32",
    providers: "u32",
    sufficients: "u32",
    data: { free: "u128", reserved: "u128", miscFrozen: "u128", feeFrozen: "u128" },
  }),
}
// TODO: Get this from the metadata store if metadata is >= v14
const AccountInfoOverrides: { [key: ChainId]: string } = {
  "crust": AccountInfoCommonOverides.noSufficients,
  "kilt-spiritnet": AccountInfoCommonOverides.u64Nonce,
  "zeitgeist": AccountInfoCommonOverides.u64Nonce,
}

const registry = new TypeRegistry()

// TODO: Check if we really need to fetch chain from chaindata in here or not!
export default class BalancesRpc {
  /**
   * Fetch or subscribe to balances by chainIds and addresses.
   *
   * @param addressesByChain - Object with chainIds as keys, and arrays of addresses as values
   * @param callback - Optional subscription callback.
   * @returns Either `Balances`, or an unsubscribe function if the `callback` parameter was given.
   */
  static async balances(addressesByChain: AddressesByChain): Promise<Balances>
  static async balances(
    addressesByChain: { [chainId: string]: Address[] },
    callback: SubscriptionCallback<Balances>
  ): Promise<UnsubscribeFn>
  static async balances(
    addressesByChain: { [chainId: string]: Address[] },
    callback?: SubscriptionCallback<Balances>
  ): Promise<Balances | UnsubscribeFn> {
    // subscription request
    if (callback !== undefined) {
      // subscribe to balances
      const subscriptionPromises = Object.entries(addressesByChain).map(([chainId, addresses]) =>
        this.subscribeBalances(chainId, addresses, callback)
      )

      // return unsubscribe function
      return () =>
        subscriptionPromises.forEach((promise) => promise.then((unsubscribe) => unsubscribe()))
    }

    // once-off request
    return (
      await Promise.all(
        Object.entries(addressesByChain).map(([chainId, addresses]) =>
          this.fetchBalances(chainId, addresses)
        )
      )
    ).reduce((allBalances, chainBalances) => allBalances.add(chainBalances), new Balances([]))
  }

  /**
   * Subscribe to balances on one chain by chainId and addresses.
   *
   * @param chainId - The chain to query balances from.
   * @param addresses - The addresses to query balances for.
   * @param callback - The subscription callback.
   * @returns The unsubscribe function.
   */
  private static async subscribeBalances(
    chainId: ChainId,
    addresses: Address[],
    callback: SubscriptionCallback<Balances>
  ): Promise<UnsubscribeFn> {
    const chain = await db.chains.get(chainId)
    if (!chain) throw new Error(`Chain ${chainId} not found in store`)

    // set up method, return message type and params
    const subscribeMethod = "state_subscribeStorage" // method we call to subscribe
    const responseMethod = "state_storage" // type of message we expect to receive for each subscription update
    const unsubscribeMethod = "state_unsubscribeStorage" // method we call to unsubscribe
    const params = this.buildParams(addresses)

    // build lookup table of `rpc hex output` -> `input address`
    const addressReferences = this.buildAddressReferences(addresses)

    // set up subscription
    const unsubscribe = await RpcFactory.subscribe(
      chainId,
      subscribeMethod,
      unsubscribeMethod,
      responseMethod,
      params,
      (error, result) => {
        if (error) return callback(error)
        callback(null, this.formatRpcResult(chain, addressReferences, result))
      }
    )

    return unsubscribe
  }

  /**
   * Fetch balances from one chain by chainId and addresses.
   *
   * @param chainId - The chain to query balances from.
   * @param addresses - The addresses to query balances for.
   * @returns The fetched balances.
   */
  private static async fetchBalances(chainId: ChainId, addresses: Address[]): Promise<Balances> {
    const chain = await db.chains.get(chainId)
    if (!chain) throw new Error(`Chain ${chainId} not found in store`)

    // set up method and params
    const method = "state_queryStorageAt" // method we call to fetch
    const params = this.buildParams(addresses)

    // build lookup table of `rpc hex output` -> `input address`
    const addressReferences = this.buildAddressReferences(addresses)

    // query rpc
    const response = await RpcFactory.send(chainId, method, params)
    const result = response[0]

    return this.formatRpcResult(chain, addressReferences, result)
  }

  /**
   * Turns an array of addresses into the params argument expected by `state_subscribeStorage` / `state_getStorage` / `state_queryStorageAt`.
   *
   * @param addresses - The addresses to query.
   * @returns The params to be sent to the RPC.
   */
  private static buildParams(addresses: Address[]): string[][] {
    return [
      addresses
        .map((address) => decodeAnyAddress(address))
        .map((addressBytes) => blake2Concat(addressBytes).replace("0x", ""))
        .map((addressHash) => `0x${moduleStorageHash}${addressHash}`),
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
  private static buildAddressReferences(addresses: Address[]): Array<[string, string]> {
    return addresses
      .map((address) => decodeAnyAddress(address))
      .map((decoded) => u8aToHex(decoded, -1, false))
      .map((reference, index) => [addresses[index], reference])
  }

  /**
   * Formats an RPC result into an instance of `Balances`
   *
   * @param chain - The chain which this result came from.
   * @param addressReferences - A lookup table for linking each balance to an `Address`.
   *                            Can be built with `BalancesRpc.buildAddressReferences`.
   * @param result - The result returned by the RPC.
   * @returns A formatted list of balances.
   */
  private static formatRpcResult(
    chain: Chain,
    addressReferences: Array<[string, string]>,
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
            `Received non-string and non-null change in RPC result : ${reference} | ${change}`
          )
          return false
        }

        if (!chain.nativeToken) {
          Sentry.captureMessage(
            `Received native token for chain which has no native token : ${chain.id}`
          )
          return false
        }

        const [address] = addressReferences.find(([, hex]) => reference.endsWith(hex)) || []
        if (!address) {
          const search = reference.slice(-64)
          const set = addressReferences.map(([, reference]) => reference).join(",\n")
          // eslint-disable-next-line no-console
          DEBUG && console.error(`Failed to find address: \n${search} in \n${set}`)
          Sentry.captureMessage(`Failed to find address: \n${search} in \n${set}`)
          return false
        }

        const accountInfo = AccountInfoOverrides[chain.id] || AccountInfo
        const balance: any = createType(registry, accountInfo, change)

        const free = (balance.data?.free.toBigInt() || BigInt("0")).toString()
        const reserved = (balance.data?.reserved.toBigInt() || BigInt("0")).toString()
        const miscFrozen = (balance.data?.miscFrozen.toBigInt() || BigInt("0")).toString()
        const feeFrozen = (balance.data?.feeFrozen.toBigInt() || BigInt("0")).toString()

        return new Balance({
          pallet: "balances",

          status: "live",

          address,
          chainId: chain.id,
          tokenId: chain.nativeToken.id,

          free,
          reserved,
          miscFrozen,
          feeFrozen,
        })
      })
      .filter((balance): balance is Balance => Boolean(balance))

    return new Balances(balances)
  }
}
