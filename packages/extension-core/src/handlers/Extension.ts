import { isAccountOwned } from "@talismn/keyring"
import { IS_FIREFOX, isTalismanHostname } from "extension-shared"

import { db } from "../db"
import { AccountsHandler } from "../domains/accounts"
import AppHandler from "../domains/app/handler"
import { hideGetStartedOnceFunded } from "../domains/app/hideGetStartedOnceFunded"
import { AssetDiscoveryHandler } from "../domains/assetDiscovery/handler"
import { BalancesHandler } from "../domains/balances"
import { BittensorHandler } from "../domains/bittensor/handler"
import { ChaindataHandler } from "../domains/chaindata/handler"
import { ChainsHandler } from "../domains/chains"
import { DefiHandler } from "../domains/defi/handler"
import { EncryptHandler } from "../domains/encrypt"
import { EthHandler } from "../domains/ethereum"
import { keyringStore } from "../domains/keyring/store"
import { MetadataHandler } from "../domains/metadata"
import MnemonicHandler from "../domains/mnemonics/handler"
import { NftsHandler } from "../domains/nfts"
import { SendFundsHandler } from "../domains/sendFunds/handler"
import { SigningHandler } from "../domains/signing"
import { SitesAuthorisationHandler } from "../domains/sitesAuthorised"
import { SolanaExtensionHandler } from "../domains/solana/handler.extension"
import { SubHandler } from "../domains/substrate/handler.extension"
import TokenRatesHandler from "../domains/tokenRates/handler"
import { updateTransactionsRestart } from "../domains/transactions/helpers"
import { talismanAnalytics } from "../libs/Analytics"
import { spawnTaskToCreateNewReport } from "../libs/GeneralReport"
import { ExtensionHandler } from "../libs/Handler"
import { MessageTypes, RequestType, ResponseType } from "../types"
import { Port, RequestIdOnly } from "../types/base"
import { ExtensionStore } from "./stores"
import { unsubscribe } from "./subscriptions"

export default class Extension extends ExtensionHandler {
  readonly #routes: Record<string, ExtensionHandler> = {}
  #autoLockMinutes = 0

  constructor(stores: ExtensionStore) {
    super(stores)

    // routing to sub-handlers
    this.#routes = {
      accounts: new AccountsHandler(stores),
      chains: new ChainsHandler(stores),
      chaindata: new ChaindataHandler(stores),
      app: new AppHandler(stores),
      balances: new BalancesHandler(stores),
      defi: new DefiHandler(stores),
      encrypt: new EncryptHandler(stores),
      eth: new EthHandler(stores),
      metadata: new MetadataHandler(stores),
      mnemonics: new MnemonicHandler(stores),
      signing: new SigningHandler(stores),
      sites: new SitesAuthorisationHandler(stores),
      tokenRates: new TokenRatesHandler(stores),
      substrate: new SubHandler(stores),
      solana: new SolanaExtensionHandler(stores),
      assetDiscovery: new AssetDiscoveryHandler(stores),
      nfts: new NftsHandler(stores),
      bittensor: new BittensorHandler(stores),
      sendFunds: new SendFundsHandler(stores),
    }

    // connect auto lock timeout setting to the password store
    this.stores.settings.observable.subscribe(({ autoLockMinutes }) => {
      this.#autoLockMinutes = autoLockMinutes
      stores.password.resetAutolockTimer(autoLockMinutes)
    })

    // reset the databaseUnavailable and databaseQuotaExceeded flags on start-up
    this.stores.errors.set({ databaseUnavailable: false, databaseQuotaExceeded: false })

    // prune old db error logs
    const now = Date.now()
    const pruneLogFilter = (timestamp: number) => now - timestamp <= 1_209_600_000 // 14 days in milliseconds
    this.stores.errors.mutate((store) => {
      store.StartupLog.push(now)
      store.StartupLog = store.StartupLog.filter(pruneLogFilter)
      store.DexieAbortLog = store.DexieAbortLog.filter(pruneLogFilter)
      store.DexieDatabaseClosedLog = store.DexieDatabaseClosedLog.filter(pruneLogFilter)
      store.DexieQuotaExceededLog = store.DexieQuotaExceededLog.filter(pruneLogFilter)
      return store
    })

    keyringStore.accounts$.subscribe(async (accounts) => {
      const sites = await stores.sites.get()

      Object.entries(sites)
        .filter(([, site]) => site.connectAllSubstrate)
        .forEach(async ([url, autoAddSite]) => {
          const existingAddresses = autoAddSite.addresses || []

          const newAddresses = accounts
            .filter((acc) => isTalismanHostname(autoAddSite.url) || isAccountOwned(acc))
            .filter(({ address }) => !existingAddresses.includes(address))
            .map(({ address }) => address)

          autoAddSite.addresses = [...existingAddresses, ...newAddresses]
          await stores.sites.updateSite(url, autoAddSite)
        })
    })

    this.initDb()
    this.cleanup()

    // fetch config from github periodically
    this.stores.remoteConfig.init()

    // hides the get started component has soon as the wallet owns funds
    hideGetStartedOnceFunded()

    // if BUILD is not "dev", submit a "wallet upgraded" event to posthog
    if (process.env.BUILD !== "dev") {
      ;(async () => {
        // don't send "wallet upgraded" event if analytics is disabled, or wallet is not onboarded
        const allowTracking = await this.stores.settings.get("useAnalyticsTracking")
        const onboarded = await this.stores.app.getIsOnboarded()
        if (!allowTracking || !onboarded || IS_FIREFOX) return

        const lastWalletUpgradedEvent = await this.stores.app.get("lastWalletUpgradedEvent")

        // short circuit if we've already sent a "wallet upgraded" event for this version
        if (lastWalletUpgradedEvent === process.env.VERSION) return

        // make sure we create a new report for this version of the wallet, not re-use one we created last version
        await this.stores.app.delete(["analyticsReportCreatedAt", "analyticsReport"])

        await spawnTaskToCreateNewReport({
          // don't refresh balances in the background, just send the existing db cache
          refreshBalances: false,

          // the primary purpose of the "wallet upgraded" event is to submit the opt-in general report.
          // `waitForReportCreated: true` lets us wait for the report to be created before we submit the event.
          waitForReportCreated: true,
        })

        await talismanAnalytics.capture("wallet upgraded")
        await this.stores.app.set({ lastWalletUpgradedEvent: process.env.VERSION })
      })()
    }
  }

  private cleanup() {
    // remove legacy entries from localStorage
    return chrome.storage.local.remove([
      "chains",
      "ethereumNetworks",
      "tokens",
      "balances",
      "metadata",
      "transactions",
    ])
  }

  private initDb() {
    // Forces database migrations to run on first start up
    // By accessing db.metadata we can be sure that dexie will:
    //   1. open a connection to the database
    //   2. (if required) run any new db migrations
    //   3. close the database connection only when it is no longer required
    //      (or re-use the connection when it's being accessed elsewhere in our code!)
    db.metadata.toArray()

    db.on("ready", async () => {
      // TODO: Add back this migration logic to delete old data from localStorage/old idb-managed db
      // (We don't store metadata OR chains in here anymore, so we have no idea whether or not its has already been initialised)
      // // if store has no chains yet, consider it's a fresh install or legacy version
      // if ((await db.chains.count()) < 1) {
      //
      //   // delete old idb-managed metadata+metadataRpc db
      //   indexedDB.deleteDatabase("talisman")
      //
      //   // TODO: Add this back again, but as an internal part of the @talismn/chaindata-provider lib
      //   // // initial data provisioning (workaround to wallet beeing installed when subsquid is down)
      // }
    })

    // marks all pending transaction as status unknown
    updateTransactionsRestart()
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
    port: Port,
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
      // Ensures that the background script remains open when the UI is also open (especially on firefox)
      case "pri(keepalive)":
        return true

      // Keeps the wallet unlocked for N (user-definable) minutes after the last user interaction
      case "pri(keepunlocked)":
        // Restart the autolock timer when the user interacts with the wallet UI
        this.stores.password.resetAutolockTimer(this.#autoLockMinutes)
        return true

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
