import { isAccountPolkadot } from "@talismn/keyring"
import { isValidSubstrateAddress } from "@talismn/util"
import { Observable, of, shareReplay } from "rxjs"

import {
  createSubscription,
  genericSubscription,
  portDisconnected,
} from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { updateAndWaitForUpdatedChaindata } from "../../rpcs/mini-metadata-updater"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { getCachedObservable$ } from "../../util/getCachedObservable"
import { keyringStore } from "../keyring/store"
import { balancePool, ExternalBalancePool } from "./pool"
import {
  BalanceSubscriptionResponse,
  RequestBalance,
  RequestBalancesByParamsSubscribe,
} from "./types"

export class BalancesHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // balances handlers -----------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(balances.get)":
        return balancePool.getBalance(request as RequestBalance)

      case "pri(balances.subscribe)": {
        const onDisconnected = portDisconnected(port)

        const accounts = await keyringStore.getAccounts()

        // TODO fix this logic: some chains with evm type accounts should still be updated (ex: Mythos, Moonbeam, LAOS)
        const updateSubstrateChains = accounts.some(isAccountPolkadot)

        // TODO: Run this on a timer or something instead of when subscribing to balances
        // todo check if not awaiting this causes any issues with custom networks
        updateAndWaitForUpdatedChaindata({ updateSubstrateChains })
        const callback = createSubscription<"pri(balances.subscribe)">(id, port)

        balancePool.subscribe(id, onDisconnected, callback)

        return true
      }

      // TODO: Replace this call with something internal to the balances store
      // i.e. refactor the balances store to allow us to subscribe to arbitrary balances here,
      // instead of being limited to the accounts which are in the wallet's keystore
      case "pri(balances.byparams.subscribe)":
        return genericSubscription(
          id,
          port,
          getExternalBalances$(request as RequestBalancesByParamsSubscribe),
        )

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}

const getExternalBalances$ = (
  params: RequestBalancesByParamsSubscribe,
): Observable<BalanceSubscriptionResponse> => {
  const cacheKey = JSON.stringify(params)

  return getCachedObservable$(cacheKey, (): Observable<BalanceSubscriptionResponse> => {
    const { addressesAndEvmNetworks, addressesAndTokens, addressesByChain } = params
    const flatAddressesByChains = Object.values(addressesByChain).flat()

    // if no addresses, return early
    if (
      !flatAddressesByChains.length &&
      !addressesAndTokens.addresses.length &&
      !addressesAndEvmNetworks.addresses.length
    )
      return of<BalanceSubscriptionResponse>({
        data: [],
        status: "live",
      })

    let externalBalancePool: ExternalBalancePool
    return new Observable<BalanceSubscriptionResponse>((subscriber) => {
      externalBalancePool = new ExternalBalancePool()

      subscriber.next({
        data: [],
        status: "initialising",
      })

      // :jean:
      const id = crypto.randomUUID()

      // :jean:
      let disconnect: () => void
      const onDisconnected = new Promise<void>((resolve) => {
        disconnect = () => resolve()
      })

      const updateSubstrateChains =
        flatAddressesByChains.some(isValidSubstrateAddress) ||
        addressesAndTokens.addresses.some(isValidSubstrateAddress)

      // wait for chaindata to hydrate, then subscribe to the pool
      updateAndWaitForUpdatedChaindata({ updateSubstrateChains }).then(() => {
        externalBalancePool.setSubcriptionParameters({
          addressesByChain,
          addressesAndEvmNetworks,
          addressesAndTokens,
        })

        externalBalancePool.subscribe(id, onDisconnected, (balances) => {
          subscriber.next(balances)
        })
      })

      return () => {
        disconnect() // this triggers some 5 sec timeout, then only it will actually unsubscribe
        externalBalancePool.destroy() // this might not play well with the above
      }
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }))
  })
}
