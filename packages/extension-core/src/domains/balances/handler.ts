import keyring from "@polkadot/ui-keyring"
import { isValidSubstrateAddress } from "@talismn/util"

import { createSubscription, portDisconnected, unsubscribe } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { updateAndWaitForUpdatedChaindata } from "../../rpcs/mini-metadata-updater"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { awaitKeyringLoaded } from "../../util/awaitKeyringLoaded"
import { ExternalBalancePool, balancePool } from "./pool"
import { RequestBalance, RequestBalancesByParamsSubscribe } from "./types"

export class BalancesHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // balances handlers -----------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(balances.get)":
        return balancePool.getBalance(request as RequestBalance)

      case "pri(balances.subscribe)": {
        const onDisconnected = portDisconnected(port)

        await awaitKeyringLoaded()
        const updateSubstrateChains = keyring
          .getAccounts()
          .some((account) => account.meta.type !== "ethereum")

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
        return subscribeBalancesByParams(id, port, request as RequestBalancesByParamsSubscribe)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}

const subscribeBalancesByParams = async (
  id: string,
  port: Port,
  {
    addressesByChain,
    addressesAndEvmNetworks,
    addressesAndTokens,
  }: RequestBalancesByParamsSubscribe
): Promise<boolean> => {
  // if no addresses, return early
  if (
    !Object.keys(addressesByChain).length &&
    !addressesAndTokens.addresses.length &&
    !addressesAndEvmNetworks.addresses.length
  )
    return true
  // create safe onDisconnect handler
  const onDisconnected = portDisconnected(port)

  // create subscription callback
  const callback = createSubscription<"pri(balances.byparams.subscribe)">(id, port)

  const updateSubstrateChains =
    Object.values(addressesByChain).flat().some(isValidSubstrateAddress) ||
    addressesAndTokens.addresses.some(isValidSubstrateAddress)

  // wait for chaindata to hydrate
  updateAndWaitForUpdatedChaindata({ updateSubstrateChains })

  const externalBalancePool = new ExternalBalancePool()

  externalBalancePool.setSubcriptionParameters({
    addressesByChain,
    addressesAndEvmNetworks,
    addressesAndTokens,
  })
  externalBalancePool.subscribe(id, onDisconnected, callback)

  // unsub on port disconnect
  onDisconnected.then((): void => {
    unsubscribe(id)
  })

  // subscription created
  return true
}
