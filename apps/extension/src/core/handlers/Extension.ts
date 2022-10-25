import { DEBUG } from "@core/constants"
import { AccountsHandler } from "@core/domains/accounts"
import { RequestAddressFromMnemonic } from "@core/domains/accounts/types"
import AppHandler from "@core/domains/app/handler"
import { getBalanceLocks } from "@core/domains/balances/helpers"
import NativeBalancesEvmRpc from "@core/domains/balances/rpc/EvmBalances"
import BalancesRpc from "@core/domains/balances/rpc/SubstrateBalances"
import {
  Balances,
  RequestBalance,
  RequestBalanceLocks,
  RequestBalancesByParamsSubscribe,
} from "@core/domains/balances/types"
import { EthHandler } from "@core/domains/ethereum"
import { MetadataHandler } from "@core/domains/metadata"
import metadataInit from "@core/domains/metadata/_metadataInit"
import { SigningHandler } from "@core/domains/signing"
import { SitesAuthorisationHandler } from "@core/domains/sitesAuthorised"
import TokensHandler from "@core/domains/tokens/handler"
import { AssetTransferHandler } from "@core/domains/transactions"
import State from "@core/handlers/State"
import { ExtensionStore } from "@core/handlers/stores"
import { db } from "@core/libs/db"
import { ExtensionHandler } from "@core/libs/Handler"
import { MessageTypes, RequestTypes, ResponseType } from "@core/types"
import { Port, RequestIdOnly } from "@core/types/base"
import { assert } from "@polkadot/util"
import { addressFromMnemonic } from "@talisman/util/addressFromMnemonic"
import { liveQuery } from "dexie"
import Browser from "webextension-polyfill"

import { createSubscription, unsubscribe } from "./subscriptions"
import chainsInit from "../libs/init/chains.json"
import evmNetworksInit from "../libs/init/evmNetworks.json"
import tokensInit from "../libs/init/tokens.json"
import { Chain } from "@core/domains/chains/types"
import { EvmNetwork } from "@core/domains/ethereum/types"
import { Token } from "@core/domains/tokens/types"

export default class Extension extends ExtensionHandler {
  readonly #routes: Record<string, ExtensionHandler> = {}
  #autoLockTimeout = 0 // cached value so we don't have to get data from the store every time

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

    // connect auto lock timeout setting to the password store
    this.stores.settings.observable.subscribe(({ autoLockTimeout }) => {
      this.#autoLockTimeout = autoLockTimeout
      stores.password.resetAutoLockTimer(autoLockTimeout)
    })

    // update the autolock timer whenever a setting is changed
    Browser.storage.onChanged.addListener(() => {
      stores.password.resetAutoLockTimer(this.#autoLockTimeout)
    })

    // Resets password update notification at extension restart if user has asked to ignore it previously
    stores.password.set({ ignorePasswordUpdate: false })

    this.initDb()

    this.initWalletFunding()
  }

  private initDb() {
    db.on("ready", async () => {
      // if store has no metadata yet
      if ((await db.metadata.count()) < 1) {
        // delete old localstorage-managed 'db'
        Browser.storage.local.remove([
          "chains",
          "ethereumNetworks",
          "tokens",
          "balances",
          "metadata",
        ])

        // delete old idb-managed metadata+metadataRpc db
        indexedDB.deleteDatabase("talisman")

        // add initial metadata
        db.metadata.bulkAdd(metadataInit)

        // init other tables (workaround to wallet beeing installed when subsquid is down)
        db.chains.bulkAdd(chainsInit as unknown as Chain[])
        db.evmNetworks.bulkAdd(evmNetworksInit as unknown as EvmNetwork[])
        db.tokens.bulkAdd(tokensInit as unknown as Token[])
      }
    })
  }

  private initWalletFunding() {
    // We need to show a specific UI until wallet has funds in it.
    // Note that showWalletFunding flag is turned on when onboarding.
    // Turn off the showWalletFunding flag as soon as there is a positive balance
    const subAppStore = this.stores.app.observable.subscribe(({ showWalletFunding, onboarded }) => {
      if (!showWalletFunding) {
        if (onboarded === "TRUE") subAppStore.unsubscribe()
        return
      }

      // look only for free balance because reserved and frozen properties are not indexed
      const obsHasFunds = liveQuery(
        async () => await db.balances.filter((b) => b.free !== "0").count()
      )
      const subBalances = obsHasFunds.subscribe((hasFunds) => {
        if (hasFunds) {
          this.stores.app.set({ showWalletFunding: false })
          subBalances.unsubscribe()
          subAppStore.unsubscribe()
        }
      })
    })
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    // Reset the auto lock timer on any message, the user is still actively using the extension
    this.stores.password.resetAutoLockTimer(this.#autoLockTimeout)

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
      case "pri(mnemonic.unlock)": {
        const transformedPw = await this.stores.password.transformPassword(
          request as RequestTypes["pri(mnemonic.unlock)"]
        )
        assert(transformedPw, "Password error")

        const seedResult = await this.stores.seedPhrase.getSeed(transformedPw)
        assert(seedResult.ok, seedResult.val)
        return seedResult.val
      }

      case "pri(mnemonic.confirm)":
        return await this.stores.seedPhrase.setConfirmed(request as boolean)

      case "pri(mnemonic.subscribe)":
        return this.stores.seedPhrase.subscribe(id, port)

      case "pri(mnemonic.address)": {
        const { mnemonic, type } = request as RequestAddressFromMnemonic
        return addressFromMnemonic(mnemonic, type)
      }

      // --------------------------------------------------------------------
      // balance handlers ---------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(balances.get)":
        return this.stores.balances.getBalance(request as RequestBalance)

      case "pri(balances.locks.get)":
        return getBalanceLocks(request as RequestBalanceLocks)

      case "pri(balances.subscribe)":
        return this.stores.balances.subscribe(id, port)

      case "pri(balances.byparams.subscribe)": {
        // create subscription callback
        const callback = createSubscription<"pri(balances.byparams.subscribe)">(id, port)

        const { addressesByChain, addressesByEvmNetwork } =
          request as RequestBalancesByParamsSubscribe

        // subscribe to balances by params
        const unsub = await BalancesRpc.balances(addressesByChain, (error, balances) => {
          // eslint-disable-next-line no-console
          if (error) DEBUG && console.error(error)
          else callback({ type: "upsert", balances: (balances ?? new Balances([])).toJSON() })
        })

        const unsubEvm = await NativeBalancesEvmRpc.balances(
          addressesByEvmNetwork?.addresses ?? [],
          addressesByEvmNetwork?.evmNetworks ?? [],
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
          unsubEvm()
        })

        // subscription created
        return true
      }

      // --------------------------------------------------------------------
      // chain handlers -----------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(chains.subscribe)":
        return Promise.all([
          this.stores.chains.hydrateStore(),
          this.stores.chains.updateRpcHealth(),
        ]).then((results) => results[0] && results[1])

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
