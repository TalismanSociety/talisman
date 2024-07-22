import keyring from "@polkadot/ui-keyring"
import { isTalismanHostname, log } from "extension-shared"

import { db } from "../db"
import { AccountsHandler } from "../domains/accounts"
import { AccountType } from "../domains/accounts/types"
import AppHandler from "../domains/app/handler"
import { trackPopupSummaryData } from "../domains/app/popupSummaries"
import { AssetDiscoveryHandler } from "../domains/assetDiscovery/handler"
import { BalancesHandler } from "../domains/balances"
import { ChainsHandler } from "../domains/chains"
import { EncryptHandler } from "../domains/encrypt"
import { EthHandler } from "../domains/ethereum"
import { MetadataHandler } from "../domains/metadata"
import MnemonicHandler from "../domains/mnemonics/handler"
import { NftsHandler } from "../domains/nfts"
import { SigningHandler } from "../domains/signing"
import { SitesAuthorisationHandler } from "../domains/sitesAuthorised"
import { SubHandler } from "../domains/substrate/handler.extension"
import TokenRatesHandler from "../domains/tokenRates/handler"
import TokensHandler from "../domains/tokens/handler"
import { updateTransactionsRestart } from "../domains/transactions/helpers"
import { AssetTransferHandler } from "../domains/transfers"
import { talismanAnalytics } from "../libs/Analytics"
import { ExtensionHandler } from "../libs/Handler"
import { MessageTypes, RequestType, ResponseType } from "../types"
import { Port, RequestIdOnly } from "../types/base"
import { awaitKeyringLoaded } from "../util/awaitKeyringLoaded"
import { fetchHasSpiritKey } from "../util/hasSpiritKey"
import { ExtensionStore } from "./stores"
import { unsubscribe } from "./subscriptions"

export default class Extension extends ExtensionHandler {
  readonly #routes: Record<string, ExtensionHandler> = {}
  #autoLockTimeout = 0

  constructor(stores: ExtensionStore) {
    super(stores)

    // routing to sub-handlers
    this.#routes = {
      accounts: new AccountsHandler(stores),
      chains: new ChainsHandler(stores),
      app: new AppHandler(stores),
      assets: new AssetTransferHandler(stores),
      balances: new BalancesHandler(stores),
      encrypt: new EncryptHandler(stores),
      eth: new EthHandler(stores),
      metadata: new MetadataHandler(stores),
      mnemonic: new MnemonicHandler(stores),
      signing: new SigningHandler(stores),
      sites: new SitesAuthorisationHandler(stores),
      tokenRates: new TokenRatesHandler(stores),
      tokens: new TokensHandler(stores),
      substrate: new SubHandler(stores),
      assetDiscovery: new AssetDiscoveryHandler(stores),
      nfts: new NftsHandler(stores),
    }

    // connect auto lock timeout setting to the password store
    this.stores.settings.observable.subscribe(({ autoLockTimeout }) => {
      this.#autoLockTimeout = autoLockTimeout
      stores.password.resetAutoLockTimer(autoLockTimeout)
    })

    // update the autolock timer whenever a setting is changed
    chrome.storage.onChanged.addListener(() => {
      stores.password.resetAutoLockTimer(this.#autoLockTimeout)
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

    awaitKeyringLoaded().then(() => {
      // Watches keyring to do things that depend on type of accounts added
      keyring.accounts.subject.subscribe(async (addresses) => {
        const sites = await stores.sites.get()

        Object.entries(sites)
          .filter(([, site]) => site.connectAllSubstrate)
          .forEach(async ([url, autoAddSite]) => {
            const newAddresses = Object.values(addresses)
              .filter(
                ({ json: { meta } }) =>
                  isTalismanHostname(autoAddSite.url) ||
                  ![AccountType.Watched, AccountType.Dcent].includes(meta.origin as AccountType)
              )
              .filter(({ json: { address } }) => !autoAddSite.addresses?.includes(address))
              .map(({ json: { address } }) => address)

            autoAddSite.addresses = [...(autoAddSite.addresses || []), ...newAddresses]
            await stores.sites.updateSite(url, autoAddSite)
          })
      })

      this.stores.app.observable.subscribe(({ onboarded }) => {
        if (onboarded === "TRUE") {
          this.checkSpiritKeyOwnership()
        }
      })
    })

    this.initDb()
    this.cleanup()

    // fetch config from github periodically
    this.stores.remoteConfig.init()

    // keeps summary data tables for the popup home screen up to date
    trackPopupSummaryData()
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

  private async checkSpiritKeyOwnership() {
    try {
      const hasSpiritKey = await fetchHasSpiritKey()
      const currentSpiritKey = await this.stores.app.get("hasSpiritKey")

      if (currentSpiritKey !== hasSpiritKey) {
        await this.stores.app.set({ hasSpiritKey, needsSpiritKeyUpdate: true })
        await this.updateSpiritKeyOwnership(hasSpiritKey)
      }
    } catch (err) {
      // ignore, don't update app store nor posthog property
      log.error("Failed to check Spirit Key ownership", { err })
    }

    // in case reporting to posthog fails, set a timer so that every 5 min we will re-attempt
    setInterval(async () => {
      const { hasSpiritKey, needsSpiritKeyUpdate } = await this.stores.app.get()
      if (needsSpiritKeyUpdate) await this.updateSpiritKeyOwnership(hasSpiritKey)
    }, 300_000)
  }

  private async updateSpiritKeyOwnership(hasSpiritKey: boolean) {
    try {
      await talismanAnalytics.capture("Spirit Key ownership check", {
        $set: { hasSpiritKey },
      })
    } catch (err) {
      // ignore, don't update app store
      log.error("Failed to update Spirit Key ownership", { err })
      return
    }
    await this.stores.app.set({ needsSpiritKeyUpdate: false })
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
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
      case "pri(ping)":
        return true

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
