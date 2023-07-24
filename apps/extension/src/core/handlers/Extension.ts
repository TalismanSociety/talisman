import { DEBUG, TEST } from "@core/constants"
import { db } from "@core/db"
import { AccountsHandler } from "@core/domains/accounts"
import { verifierCertificateMnemonicStore } from "@core/domains/accounts/store.verifierCertificateMnemonic"
import { AccountTypes, RequestAddressFromMnemonic } from "@core/domains/accounts/types"
import AppHandler from "@core/domains/app/handler"
import { featuresStore } from "@core/domains/app/store.features"
import { BalancesHandler } from "@core/domains/balances"
import { EncryptHandler } from "@core/domains/encrypt"
import { EthHandler } from "@core/domains/ethereum"
import { MetadataHandler } from "@core/domains/metadata"
import { SigningHandler } from "@core/domains/signing"
import { SitesAuthorisationHandler } from "@core/domains/sitesAuthorised"
import { SubHandler } from "@core/domains/substrate/handler.extension"
import TokenRatesHandler from "@core/domains/tokenRates/handler"
import TokensHandler from "@core/domains/tokens/handler"
import { updateTransactionsRestart } from "@core/domains/transactions/helpers"
import { AssetTransferHandler } from "@core/domains/transfers"
import { ExtensionStore } from "@core/handlers/stores"
import { unsubscribe } from "@core/handlers/subscriptions"
import { talismanAnalytics } from "@core/libs/Analytics"
import { ExtensionHandler } from "@core/libs/Handler"
import { generateQrAddNetworkSpecs, generateQrUpdateNetworkMetadata } from "@core/libs/QrGenerator"
import { log } from "@core/log"
import { MessageTypes, RequestType, ResponseType } from "@core/types"
import { Port, RequestIdOnly } from "@core/types/base"
import { CONFIG_RATE_LIMIT_ERROR, getConfig } from "@core/util/getConfig"
import { fetchHasSpiritKey } from "@core/util/hasSpiritKey"
import keyring from "@polkadot/ui-keyring"
import { assert, u8aToHex } from "@polkadot/util"
import * as Sentry from "@sentry/browser"
import { addressFromMnemonic } from "@talisman/util/addressFromMnemonic"
import { db as balancesDb } from "@talismn/balances"
import { liveQuery } from "dexie"
import Browser from "webextension-polyfill"

let CONFIG_UPDATE_INTERVAL = 1000 * 60 * 5 // 5 minutes
const MAX_CONFIG_UPDATE_INTERVAL = 1000 * 60 * 60 // 1 hour
export default class Extension extends ExtensionHandler {
  readonly #routes: Record<string, ExtensionHandler> = {}
  #configUpdater?: NodeJS.Timeout
  #autoLockTimeout = 0

  constructor(stores: ExtensionStore) {
    super(stores)

    // routing to sub-handlers
    this.#routes = {
      accounts: new AccountsHandler(stores),
      app: new AppHandler(stores),
      assets: new AssetTransferHandler(stores),
      balances: new BalancesHandler(stores),
      encrypt: new EncryptHandler(stores),
      eth: new EthHandler(stores),
      metadata: new MetadataHandler(stores),
      signing: new SigningHandler(stores),
      sites: new SitesAuthorisationHandler(stores),
      tokenRates: new TokenRatesHandler(stores),
      tokens: new TokensHandler(stores),
      substrate: new SubHandler(stores),
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

    // Watches keyring to do things that depend on type of accounts added
    // Delayed by 2 sec so that keyring accounts will have loaded
    setTimeout(
      () =>
        keyring.accounts.subject.subscribe(async (addresses) => {
          const sites = await stores.sites.get()

          Object.entries(sites)
            .filter(([, site]) => site.connectAllSubstrate)
            .forEach(async ([url, autoAddSite]) => {
              const newAddresses = Object.values(addresses)
                .filter(
                  ({ json: { address, meta } }) =>
                    meta.origin !== AccountTypes.WATCHED &&
                    !autoAddSite.addresses?.includes(address)
                )
                .map(({ json: { address } }) => address)

              autoAddSite.addresses = [...(autoAddSite.addresses || []), ...newAddresses]
              await stores.sites.updateSite(url, autoAddSite)
            })
        }),
      DEBUG || TEST ? 0 : 2000
    )

    // setup polling for config from github
    setTimeout(async () => {
      this.fetchRemoteConfig()
      this.setConfigUpdateTimeout()
    }, 1000) // initial call immediately after extension start

    this.initDb()
    this.initWalletFunding()
    this.checkSpiritKeyOwnership()
    this.cleanup()
  }

  private setConfigUpdateTimeout() {
    if (this.#configUpdater) clearInterval(this.#configUpdater)
    this.#configUpdater = setInterval(async () => {
      try {
        await this.fetchRemoteConfig()
      } catch (e) {
        // exponential backoff for rate limits
        if (
          (e as Error).message === CONFIG_RATE_LIMIT_ERROR &&
          CONFIG_UPDATE_INTERVAL < MAX_CONFIG_UPDATE_INTERVAL
        )
          CONFIG_UPDATE_INTERVAL = CONFIG_UPDATE_INTERVAL * 2
        else Sentry.captureException(e)
      }
      this.setConfigUpdateTimeout()
    }, CONFIG_UPDATE_INTERVAL)
  }

  private async fetchRemoteConfig() {
    // in dev mode, ignore github config
    if (DEBUG) return
    try {
      const config = await getConfig()
      if (config) return featuresStore.update(config.featureFlags)
    } catch (e) {
      // bubble up rate limit errors
      if ((e as Error).message === CONFIG_RATE_LIMIT_ERROR) throw e
      // ignore other errors
      log.error("Failed to fetch remote config", { err: e })
    }

    return
  }

  private cleanup() {
    // remove legacy entries from localStorage
    return Browser.storage.local.remove([
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
      //   // TODO: Add this back again, but as an internal part of the @talismn/chaindata-provider-extension lib
      //   // // initial data provisioning (workaround to wallet beeing installed when subsquid is down)
      // }
    })

    // marks all pending transaction as status unknown
    updateTransactionsRestart()
  }

  private initWalletFunding() {
    // We need to show a specific UI until wallet has funds in it.
    // Note that hasFunds flag is turned off when onboarding without importing a seed.
    // Turn on the hasFunds flag as soon as there is a positive balance
    const subAppStore = this.stores.app.observable.subscribe(({ hasFunds, onboarded }) => {
      if (hasFunds) {
        if (onboarded === "TRUE") subAppStore.unsubscribe()
        return
      }

      // look only for free balance because reserved and frozen properties are not indexed
      const obsHasFunds = liveQuery(
        async () => await balancesDb.balances.filter((balance) => balance.free !== "0").count()
      )
      const subBalances = obsHasFunds.subscribe((positiveBalances) => {
        if (positiveBalances) {
          if (!hasFunds) talismanAnalytics.capture("wallet funded")
          this.stores.app.set({ hasFunds: true })
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
        const currentSpiritKey = await this.stores.app.get("hasSpiritKey")

        if (currentSpiritKey !== hasSpiritKey) {
          await this.stores.app.set({ hasSpiritKey, needsSpiritKeyUpdate: true })
          await this.updateSpiritKeyOwnership(hasSpiritKey)
        }
      } catch (err) {
        // ignore, don't update app store nor posthog property
        log.error("Failed to check Spirit Key ownership", { err })
      }
    }, 10_000)

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
      // --------------------------------------------------------------------
      // mnemonic handlers --------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(mnemonic.unlock)": {
        const transformedPw = await this.stores.password.transformPassword(
          request as RequestType<"pri(mnemonic.unlock)">
        )
        assert(transformedPw, "Password error")

        const seedResult = await this.stores.seedPhrase.getSeed(transformedPw)
        assert(seedResult.val, "No mnemonic present")
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
      // chain handlers -----------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(chains.subscribe)":
        return this.stores.chains.hydrateStore()

      case "pri(chains.generateQr.addNetworkSpecs)": {
        const vaultCipher = await verifierCertificateMnemonicStore.get("cipher")
        assert(vaultCipher, "No Polkadot Vault Verifier Certificate Mnemonic found")

        const { genesisHash } = request as RequestType<"pri(chains.generateQr.addNetworkSpecs)">
        const data = await generateQrAddNetworkSpecs(genesisHash)
        // serialize as hex for transfer
        return u8aToHex(data)
      }

      case "pri(chains.generateQr.updateNetworkMetadata)": {
        const vaultCipher = await verifierCertificateMnemonicStore.get("cipher")
        assert(vaultCipher, "No Polkadot Vault Verifier Certificate Mnemonic found")

        const { genesisHash, specVersion } =
          request as RequestType<"pri(chains.generateQr.updateNetworkMetadata)">
        const data = await generateQrUpdateNetworkMetadata(genesisHash, specVersion)
        // serialize as hex for transfer
        return u8aToHex(data)
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
