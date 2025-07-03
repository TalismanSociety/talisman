import { TokenList } from "@talismn/chaindata-provider"
import { DbTokenRates, fetchTokenRates, TokenRateCurrency } from "@talismn/token-rates"
import { Subscription } from "dexie"
import { log } from "extension-shared"
import { uniq } from "lodash"
import debounce from "lodash/debounce"
import { BehaviorSubject, combineLatest, map } from "rxjs"

import { db } from "../../db"
import { createSubscription, unsubscribe } from "../../handlers/subscriptions"
import { chaindataProvider } from "../../rpcs/chaindata"
import { Port } from "../../types/base"
import { remoteConfigStore } from "../app/store.remoteConfig"
import { settingsStore } from "../app/store.settings"
import { activeTokensStore, filterActiveTokens } from "../balances/store.activeTokens"

// refresh token rates on subscription start if older than 1 minute
const MIN_REFRESH_INTERVAL = 1 * 60_000

// refresh token rates while sub is active every 2 minutes
const REFRESH_INTERVAL = 2 * 60_000

type TokenRatesSubscriptionCallback = (rates: DbTokenRates[]) => void

export class TokenRatesStore {
  #lastUpdateKey = ""
  #lastUpdateAt = Date.now() // will prevent a first empty call if tokens aren't loaded yet
  #subscriptions = new BehaviorSubject<Record<string, TokenRatesSubscriptionCallback>>({})
  #isWatching = false

  constructor() {
    this.watchSubscriptions()
  }

  /**
   * Toggles on & off the price updates, based on if there are any active subscriptions
   */
  private watchSubscriptions = (): void => {
    let pollInterval: ReturnType<typeof setInterval> | null = null
    let subTokenList: Subscription | null = null

    this.#subscriptions.subscribe((subscriptions) => {
      if (Object.keys(subscriptions).length) {
        // watching state check
        if (this.#isWatching) return
        this.#isWatching = true

        // refresh price every minute if observed
        pollInterval = setInterval(() => {
          if (this.#subscriptions.observed) this.hydrateStore()
        }, REFRESH_INTERVAL)

        // refresh when token list changes : crucial for first popup load after install or db migration
        const obsTokens = chaindataProvider.getTokensMapById()
        const obsActiveTokens = activeTokensStore.observable
        const obsCurrencies = settingsStore.observable.pipe(
          map((settings) => settings.selectableCurrencies),
        )

        subTokenList = combineLatest([obsTokens, obsActiveTokens, obsCurrencies]).subscribe(
          debounce(async ([tokens, activeTokens, currencies]) => {
            if (this.#subscriptions.observed) {
              const tokensList = filterActiveTokens(tokens, activeTokens)
              await this.updateTokenRates(tokensList, currencies)
            }
          }, 500),
        )
      } else {
        // watching state check
        if (!this.#isWatching) return
        this.#isWatching = false

        if (pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }

        if (subTokenList) {
          subTokenList.unsubscribe()
          subTokenList = null
        }
      }
    })
  }

  async hydrateStore(): Promise<boolean> {
    try {
      const [tokens, activeTokens, currencies] = await Promise.all([
        chaindataProvider.getTokensMapById(),
        activeTokensStore.get(),
        settingsStore.get("selectableCurrencies"),
      ])

      const tokensList = filterActiveTokens(tokens, activeTokens)
      await this.updateTokenRates(tokensList, currencies)

      return true
    } catch (error) {
      log.error(`Failed to fetch tokenRates`, error)
      return false
    }
  }

  /**
   * WARNING: Make sure the tokens list `tokens` only includes active tokens.
   */
  private async updateTokenRates(
    tokens: TokenList,
    currencies: TokenRateCurrency[],
  ): Promise<void> {
    const now = Date.now()

    const updateKey = Object.keys(tokens ?? {})
      .concat(...currencies)
      .sort()
      .join(",")
    if (now - this.#lastUpdateAt < MIN_REFRESH_INTERVAL && this.#lastUpdateKey === updateKey) return

    // update lastUpdateAt & lastUpdateTokenIds before fetching to prevent api call bursts
    this.#lastUpdateAt = now
    this.#lastUpdateKey = updateKey

    try {
      const coinsApiConfig = await remoteConfigStore.get("coinsApi")

      // force usd to be included, because hide small balances feature requires it
      const effectiveCurrencyIds = uniq<TokenRateCurrency>([...currencies, "usd"])

      const tokenRates = await fetchTokenRates(tokens, effectiveCurrencyIds, coinsApiConfig)
      const putTokenRates: DbTokenRates[] = Object.entries(tokenRates).map(([tokenId, rates]) => ({
        tokenId,
        rates,
      }))

      // update external subscriptions
      Object.values(this.#subscriptions.value).map((cb) => cb(putTokenRates))

      await db.transaction("rw", db.tokenRates, async () => {
        // override all tokenRates
        await db.tokenRates.bulkPut(putTokenRates)

        // delete tokenRates for tokens which no longer exist
        const tokenIds = await db.tokenRates.toCollection().primaryKeys()
        const validTokenIds = new Set(Object.keys(tokenRates))
        const deleteTokenIds = tokenIds.filter((tokenId) => !validTokenIds.has(tokenId))
        if (deleteTokenIds.length > 0) await db.tokenRates.bulkDelete(deleteTokenIds)
      })
    } catch (err) {
      // reset lastUpdateTokenIds to retry on next call
      this.#lastUpdateKey = ""
      throw err
    }
  }

  public async subscribe(id: string, port: Port, unsubscribeCallback?: () => void) {
    const cb = createSubscription<"pri(tokenRates.subscribe)">(id, port)
    const currentTokenRates = await db.tokenRates.toArray()
    cb(currentTokenRates)

    const currentSubscriptions = this.#subscriptions.value
    this.#subscriptions.next({ ...currentSubscriptions, [id]: cb })

    if (Object.values(currentSubscriptions).length === 0) {
      // if there's no subscriptions, hydrate the store. If there are already subscriptions,
      // the store will be hydrated via the interval anyway
      this.hydrateStore()
    }

    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      const newSubscriptions = { ...this.#subscriptions.value }
      delete newSubscriptions[id]
      this.#subscriptions.next(newSubscriptions)
      if (unsubscribeCallback) unsubscribeCallback()
    })

    return true
  }
}

export const tokenRatesStore = new TokenRatesStore()
