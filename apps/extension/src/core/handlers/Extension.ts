import { DEBUG } from "@core/constants"
import { db } from "@core/db"
import { AccountsHandler } from "@core/domains/accounts"
import { RequestAddressFromMnemonic } from "@core/domains/accounts/types"
import AppHandler from "@core/domains/app/handler"
import { getBalanceLocks } from "@core/domains/balances/helpers"
import { balanceModules } from "@core/domains/balances/store"
import {
  Balances,
  RequestBalance,
  RequestBalanceLocks,
  RequestBalancesByParamsSubscribe,
} from "@core/domains/balances/types"
import { EncryptHandler } from "@core/domains/encrypt"
import { EthHandler } from "@core/domains/ethereum"
import { MetadataHandler } from "@core/domains/metadata"
import { SigningHandler } from "@core/domains/signing"
import { SitesAuthorisationHandler } from "@core/domains/sitesAuthorised"
import TokenRatesHandler from "@core/domains/tokenRates/handler"
import TokensHandler from "@core/domains/tokens/handler"
import { AssetTransferHandler } from "@core/domains/transactions"
import State from "@core/handlers/State"
import { ExtensionStore } from "@core/handlers/stores"
import { talismanAnalytics } from "@core/libs/Analytics"
import { ExtensionHandler } from "@core/libs/Handler"
import { log } from "@core/log"
import { chainConnector } from "@core/rpcs/chain-connector"
import { chainConnectorEvm } from "@core/rpcs/chain-connector-evm"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { MessageTypes, RequestTypes, ResponseType } from "@core/types"
import { Port, RequestIdOnly } from "@core/types/base"
import { fetchHasSpiritKey } from "@core/util/hasSpiritKey"
import { assert } from "@polkadot/util"
import { addressFromMnemonic } from "@talisman/util/addressFromMnemonic"
import { AddressesByToken, db as balancesDb } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"
import { liveQuery } from "dexie"
import Browser from "webextension-polyfill"

// import chainsInit from "../libs/init/chains.json"
// import evmNetworksInit from "../libs/init/evmNetworks.json"
// import tokensInit from "../libs/init/tokens.json"
import { createSubscription, unsubscribe } from "./subscriptions"

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
      encrypt: new EncryptHandler(state, stores),
      signing: new SigningHandler(state, stores),
      sites: new SitesAuthorisationHandler(state, stores),
      tokens: new TokensHandler(state, stores),
      tokenRates: new TokenRatesHandler(state, stores),
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
    this.checkSpiritKeyOwnership()
  }

  private initDb() {
    // db.on("ready", async () => {
    //   console.log("extension db ready")
    //   // TODO: Add back this migration logic to delete old data from localStorage/old idb-managed db
    //   // (We don't store metadata OR chains in here anymore, so we have no idea whether or not its has already been initialised)
    //   // // if store has no chains yet, consider it's a fresh install or legacy version
    //   // if ((await db.chains.count()) < 1) {
    //   //   // delete old localstorage-managed 'db'
    //   //   Browser.storage.local.remove([
    //   //     "chains",
    //   //     "ethereumNetworks",
    //   //     "tokens",
    //   //     "balances",
    //   //     "metadata",
    //   //   ])
    //   //
    //   //   // delete old idb-managed metadata+metadataRpc db
    //   //   indexedDB.deleteDatabase("talisman")
    //   //
    //   //   // TODO: Add this back again, but as an internal part of the @talismn/chaindata-provider-extension lib
    //   //   // // initial data provisioning (workaround to wallet beeing installed when subsquid is down)
    //   //   // db.chains.bulkAdd(chainsInit as unknown as Chain[])
    //   //   // db.evmNetworks.bulkAdd(evmNetworksInit as unknown as EvmNetwork[])
    //   //   // db.tokens.bulkAdd(tokensInit as unknown as Token[])
    //   // }
    // })
    // db.on("blocked", () => {
    //   console.log("db blocked")
    // })
    // db.on("close", () => {
    //   console.log("db close")
    // })
    // db.on("populate", () => {
    //   console.log("db populate")
    // })
    // db.on("versionchange", () => {
    //   console.log("db versionchange")
    // })
    // Forces database migrations to run on first start up
    db.open()
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
        async () => await balancesDb.balances.filter((balance) => balance.free !== "0").count()
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

  private checkSpiritKeyOwnership() {
    // wait 10 seconds as this check is low priority
    // also need to be wait for keyring to be loaded and accounts populated
    setTimeout(async () => {
      try {
        const hasSpiritKey = await fetchHasSpiritKey()
        this.stores.app.set({ hasSpiritKey })
        await talismanAnalytics.capture("Spirit Key ownership check", {
          $set: { hasSpiritKey },
        })
      } catch (err) {
        // ignore, don't update app store nor posthog property
        log.error("Failed to check Spirit Key ownership", { err })
      }
    }, 10_000)
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

      // TODO: Replace this call with something internal to the balances store
      // i.e. refactor the balances store to allow us to subscribe to arbitrary balances here,
      // instead of being limited to the accounts which are in the wallet's keystore
      case "pri(balances.byparams.subscribe)": {
        // create subscription callback
        const callback = createSubscription<"pri(balances.byparams.subscribe)">(id, port)

        const { addressesByChain, addressesByEvmNetwork } =
          request as RequestBalancesByParamsSubscribe

        const addressesByToken: AddressesByToken<Token> = {}
        const chains = await chaindataProvider.chains()
        const evmNetworks = await chaindataProvider.evmNetworks()

        Object.entries(addressesByChain).forEach(([chainId, addresses]) => {
          if (chains[chainId] === undefined) return
          const tokenIds = (chains[chainId].tokens || []).map(({ id }) => id)
          for (const tokenId of tokenIds) {
            if (addressesByToken[tokenId] === undefined) addressesByToken[tokenId] = []
            addressesByToken[tokenId] = addressesByToken[tokenId].concat(addresses)
          }
        })
        addressesByEvmNetwork.evmNetworks.forEach(({ id: evmNetworkId }) => {
          if (evmNetworks[evmNetworkId] === undefined) return
          const tokenIds = (evmNetworks[evmNetworkId].tokens || []).map(({ id }) => id)
          for (const tokenId of tokenIds) {
            if (addressesByToken[tokenId] === undefined) addressesByToken[tokenId] = []
            addressesByToken[tokenId] = addressesByToken[tokenId].concat(
              addressesByEvmNetwork.addresses
            )
          }
        })

        // subscribe to balances by params
        const closeSubscriptionCallbacks = balanceModules.map((balanceModule) =>
          balanceModule.subscribeBalances(
            { substrate: chainConnector, evm: chainConnectorEvm },
            chaindataProvider,
            addressesByToken ?? {},
            (error, result) => {
              // eslint-disable-next-line no-console
              if (error) DEBUG && console.error(error)
              else callback({ type: "upsert", balances: (result ?? new Balances([])).toJSON() })
            }
          )
        )

        // unsub on port disconnect
        port.onDisconnect.addListener((): void => {
          unsubscribe(id)
          closeSubscriptionCallbacks.forEach((cb) => cb.then((close) => close()))
        })

        // subscription created
        return true
      }

      // --------------------------------------------------------------------
      // chain handlers -----------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(chains.subscribe)":
        return await this.stores.chains.hydrateStore()

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
