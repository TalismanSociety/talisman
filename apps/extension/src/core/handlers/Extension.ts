import {
  Balances,
  MessageTypes,
  RequestTypes,
  ResponseType,
  Port,
  RequestAddressFromMnemonic,
  RequestBalance,
  RequestBalancesByParamsSubscribe,
  RequestIdOnly,
} from "@core/types"
import State from "@core/handlers/State"
import { ExtensionStore } from "@core/handlers/stores"
import { ExtensionHandler } from "@core/libs/Handler"
import { AccountsHandler } from "@core/domains/accounts"
import { SitesAuthorisationHandler } from "@core/domains/sitesAuthorised"
import { MetadataHandler } from "@core/domains/metadata"
import AppHandler from "@core/domains/app/handler"
import { EthHandler } from "@core/domains/ethereum"
import { AssetTransferHandler } from "@core/domains/transactions"
import { SigningHandler } from "@core/domains/signing"
import { createSubscription, unsubscribe } from "./subscriptions"
import { addressFromMnemonic } from "@talisman/util/addressFromMnemonic"
import BalancesRpc from "@core/libs/rpc/Balances"
import { DEBUG } from "@core/constants"
import TokensHandler from "@core/domains/tokens/handler"

export default class Extension extends ExtensionHandler {
  readonly #routes: Record<string, ExtensionHandler> = {}

  constructor(state: State, stores: ExtensionStore) {
    super(state, stores)

    // routing to sub-handlers
    this.#routes = {
      accounts: new AccountsHandler(state, stores),
      app: new AppHandler(state, stores),
      assets: new AssetTransferHandler(state, stores),
      eth: new EthHandler(state, stores),
      metadata: new MetadataHandler(state, stores),
      signing: new SigningHandler(state, stores),
      sites: new SitesAuthorisationHandler(state, stores),
      tokens: new TokensHandler(state, stores),
    }
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    // --------------------------------------------------------------------
    // First try to unsubscribe                          ------------------
    // --------------------------------------------------------------------
    if (type === "pri(unsubscribe)") {
      const { id: unsubscribeId } = request as RequestIdOnly
      unsubscribe(unsubscribeId)
      return null
    }
    // --------------------------------------------------------------------
    // Then try known sub-handlers based on prefix of message ------------
    // --------------------------------------------------------------------
    try {
      const routeKey = type.split("pri(")[1].split(".")[0]
      const subhandler = this.#routes[routeKey]
      if (subhandler) return subhandler.handle(id, type, request, port)
    } catch (e) {
      throw new Error(`Unable to handle message of type ${type}`)
    }

    // --------------------------------------------------------------------
    // Then try remaining which are present in this class
    // --------------------------------------------------------------------
    switch (type) {
      // --------------------------------------------------------------------
      // mnemonic handlers --------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(mnemonic.unlock)":
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return await this.stores.seedPhrase.getSeed(request as string)

      case "pri(mnemonic.confirm)":
        return await this.stores.seedPhrase.setConfirmed(request as boolean)

      case "pri(mnemonic.subscribe)":
        return this.stores.seedPhrase.subscribe(id, port)

      case "pri(mnemonic.address)":
        const { mnemonic, type } = request as RequestAddressFromMnemonic
        return addressFromMnemonic(mnemonic, type)

      // --------------------------------------------------------------------
      // balance handlers ---------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(balances.get)":
        return this.stores.balances.getBalance(request as RequestBalance)

      case "pri(balances.subscribe)":
        return this.stores.balances.subscribe(id, port)

      case "pri(balances.byparams.subscribe)":
        // create subscription callback
        const callback = createSubscription<"pri(balances.byparams.subscribe)">(id, port)

        // subscribe to balances by params
        const unsub = await BalancesRpc.balances(
          (request as RequestBalancesByParamsSubscribe).addressesByChain,
          (error, balances) => {
            // eslint-disable-next-line no-console
            if (error) DEBUG && console.error(error)
            else callback({ type: "upsert", balances: (balances ?? new Balances([])).toJSON() })
          }
        )

        // unsub on port disconnect
        port.onDisconnect.addListener((): void => {
          unsubscribe(id)
          unsub()
        })

        // subscription created
        return true

      // --------------------------------------------------------------------
      // chain handlers -----------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(chains.subscribe)":
        return this.stores.chains.hydrateStore()

      // --------------------------------------------------------------------
      // transaction handlers -----------------------------------------------
      // --------------------------------------------------------------------
      case "pri(transactions.subscribe)":
        return this.stores.transactions.subscribe(id, port)

      case "pri(transactions.byid.subscribe)":
        return this.stores.transactions.subscribeById(id, port, request as RequestIdOnly)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
