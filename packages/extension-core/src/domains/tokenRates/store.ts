import { TokenList } from "@talismn/chaindata-provider"
import { fetchTokenRates, TokenRateCurrency, TokenRatesStorage } from "@talismn/token-rates"
import { Subscription } from "dexie"
import { log } from "extension-shared"
import { isEqual, uniq } from "lodash-es"
import debounce from "lodash-es/debounce"
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  map,
  ReplaySubject,
} from "rxjs"

import { getBlobStore } from "../../db"
import { createSubscription, unsubscribe } from "../../handlers/subscriptions"
import { chaindataProvider } from "../../rpcs/chaindata"
import { Port } from "../../types/base"
import { remoteConfigStore } from "../app/store.remoteConfig"
import { settingsStore } from "../app/store.settings"
import { activeTokensStore, filterActiveTokens } from "../balances/store.activeTokens"

const blobStore = getBlobStore<TokenRatesStorage>("tokenRates")

const DEFAULT_TOKEN_RATES: TokenRatesStorage = { tokenRates: {} }
const tokenRates$ = new ReplaySubject<TokenRatesStorage>(1)
// persist changes to disk
tokenRates$
  .pipe(debounceTime(2_000), distinctUntilChanged<TokenRatesStorage>(isEqual))
  .subscribe((storage) => {
    log.debug(
      `[tokenRates] updating db blob with data (tokenRates:${Object.values(storage.tokenRates).length})`,
    )
    blobStore.set(storage)
  })
// load from disk on startup
blobStore.get().then(
  (storage) => {
    if (!storage) return tokenRates$.next(DEFAULT_TOKEN_RATES)
    tokenRates$.next({ ...DEFAULT_TOKEN_RATES, ...storage })
  },
  (error) => {
    log.error("[tokenRates] failed to load tokenRates store on startup", error)
    tokenRates$.next(DEFAULT_TOKEN_RATES)
  },
)

// refresh token rates on subscription start if older than 1 minute
const MIN_REFRESH_INTERVAL = 1 * 60_000

// refresh token rates while sub is active every 2 minutes
const REFRESH_INTERVAL = 2 * 60_000

type TokenRatesSubscriptionCallback = (rates: TokenRatesStorage) => void

// TODO: Refactor this class to remove all the manual subscription handling, and instead just leverage the wonderful ReplaySubject to magically manage it all for us.
export class TokenRatesStore {
  #storage$: ReplaySubject<TokenRatesStorage>

  #lastUpdateKey = ""
  #lastUpdateAt = Date.now() // will prevent a first empty call if tokens aren't loaded yet
  #subscriptions = new BehaviorSubject<Record<string, TokenRatesSubscriptionCallback>>({})
  #isWatching = false

  constructor() {
    this.#storage$ = tokenRates$

    this.watchSubscriptions()
  }

  get storage$() {
    return this.#storage$.asObservable()
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
        const obsTokens = chaindataProvider.getTokensMapById$()
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
      const putTokenRates: TokenRatesStorage = { tokenRates }

      // update external subscriptions
      Object.values(this.#subscriptions.value).map((cb) => cb(putTokenRates))

      this.#storage$.next(putTokenRates)
    } catch (err) {
      // reset lastUpdateTokenIds to retry on next call
      this.#lastUpdateKey = ""
      throw err
    }
  }

  public async subscribe(id: string, port: Port, unsubscribeCallback?: () => void) {
    const cb = createSubscription<"pri(tokenRates.subscribe)">(id, port)
    const currentTokenRates = await firstValueFrom(this.#storage$)
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
