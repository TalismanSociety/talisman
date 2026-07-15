import { COINS_API_URL } from "@common/constants"
import { log } from "@common/log"
import type { Network, TokenId, TokenList } from "@talismn/chaindata-provider"
import {
  fetchTokenRates,
  type TokenRateCurrency,
  type TokenRatesStorage,
} from "@talismn/token-rates"
import type { Subscription } from "dexie"
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
import type { Port } from "../../types/base"
import { settingsStore } from "../app/store.settings"
import {
  type ActiveNetworks,
  activeNetworksStore,
  isNetworkActive,
} from "../balances/store.activeNetworks"
import { activeTokensStore, filterActiveTokens } from "../balances/store.activeTokens"
import { fetchDTaoTokenRatesForWallet } from "./dtaoTokenRates"

const blobStore = getBlobStore<TokenRatesStorage>("tokenRates")

const DEFAULT_TOKEN_RATES: TokenRatesStorage = { tokenRates: {} }
const tokenRates$ = new ReplaySubject<TokenRatesStorage>(1)
// persist changes to disk
tokenRates$
  .pipe(debounceTime(2_000), distinctUntilChanged<TokenRatesStorage>(isEqual))
  .subscribe((storage) => {
    log.debug(
      `[tokenRates] updating db blob with data (tokenRates:${Object.values(storage.tokenRates).length})`
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
  }
)

// refresh token rates on subscription start if older than 1 minute
const MIN_REFRESH_INTERVAL = 1 * 60_000

// refresh token rates while sub is active every 2 minutes
const REFRESH_INTERVAL = 2 * 60_000

type TokenRatesSubscriptionCallback = (rates: TokenRatesStorage) => void

// TODO: Refactor this class to remove all the manual subscription handling, and instead just leverage the wonderful ReplaySubject to magically manage it all for us.
/** @knipignore exported for typeof usage in stores.ts */
export class TokenRatesStore {
  #storage$: ReplaySubject<TokenRatesStorage>

  #lastUpdateKey = ""
  #lastUpdateAt = Date.now() // will prevent a first empty call if tokens aren't loaded yet
  #subscriptions = new BehaviorSubject<Record<string, TokenRatesSubscriptionCallback>>({})
  #isWatching = false

  // In-memory set of additional token IDs registered by the frontend (e.g. swap tokens).
  // Accumulated across the session, cleared naturally on service worker restart.
  #additionalTokenIds = new Set<TokenId>()

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
        const obsNetworks = chaindataProvider.networks$
        const obsActiveTokens = activeTokensStore.observable
        // toggling a network changes the token list (tokens of inactive networks get no rates)
        const obsActiveNetworks = activeNetworksStore.observable
        const obsCurrencies = settingsStore.observable.pipe(
          map((settings) => settings.selectableCurrencies)
        )

        subTokenList = combineLatest([
          obsTokens,
          obsNetworks,
          obsActiveTokens,
          obsActiveNetworks,
          obsCurrencies,
        ]).subscribe(
          debounce(async ([tokens, networks, activeTokens, activeNetworks, currencies]) => {
            if (this.#subscriptions.observed) {
              const tokensList = this.getTokensForRates(
                tokens,
                activeTokens,
                networks,
                activeNetworks
              )
              await this.updateTokenRates(tokensList, currencies)
            }
          }, 500)
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
      const [tokens, networks, activeTokens, activeNetworks, currencies] = await Promise.all([
        chaindataProvider.getTokensMapById(),
        chaindataProvider.getNetworks(),
        activeTokensStore.get(),
        activeNetworksStore.get(),
        settingsStore.get("selectableCurrencies"),
      ])

      const tokensList = this.getTokensForRates(tokens, activeTokens, networks, activeNetworks)
      await this.updateTokenRates(tokensList, currencies)

      return true
    } catch (error) {
      log.error(`Failed to fetch tokenRates`, error)
      return false
    }
  }

  /**
   * Registers additional token IDs for rate fetching (e.g. tokens selected in swap UI).
   * Accumulated in memory; clears on service worker restart.
   */
  registerAdditional(tokenIds: TokenId[]): void {
    let changed = false
    for (const id of tokenIds) {
      if (!this.#additionalTokenIds.has(id)) {
        this.#additionalTokenIds.add(id)
        changed = true
      }
    }
    if (changed) this.hydrateStore()
  }

  /** Returns active tokens of active networks, merged with any additionally registered tokens. */
  private getTokensForRates(
    allTokens: TokenList,
    activeTokens: Record<string, boolean>,
    networks: Network[],
    activeNetworks: ActiveNetworks
  ) {
    // tokens of inactive networks get no rates, mirroring the balances pipeline
    const activeNetworkIds = new Set(
      networks.filter((network) => isNetworkActive(network, activeNetworks)).map(({ id }) => id)
    )
    const tokensList = Object.fromEntries(
      Object.entries(filterActiveTokens(allTokens, activeTokens)).filter(([, token]) =>
        activeNetworkIds.has(token.networkId)
      )
    ) as TokenList

    // additionally registered tokens (e.g. swap tokens) get rates regardless of active states
    for (const tokenId of this.#additionalTokenIds) {
      if (!tokensList[tokenId] && allTokens[tokenId]) tokensList[tokenId] = allTokens[tokenId]
    }

    return tokensList
  }

  /**
   * WARNING: Make sure the tokens list `tokens` only includes active and additionally registered tokens.
   */
  private async updateTokenRates(
    tokens: TokenList,
    currencies: TokenRateCurrency[]
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
      // force usd to be included, because hide small balances feature requires it
      const effectiveCurrencyIds = uniq<TokenRateCurrency>([...currencies, "usd", "tao"])

      const tokenRates = await fetchTokenRates(tokens, effectiveCurrencyIds, {
        apiUrl: COINS_API_URL,
      })

      // publish the fresh rates immediately — the dtao fetch below (bittensor RPC + tao-data
      // api) must not delay rates for the rest of the wallet. previous dtao entries are
      // carried over so alpha fiat values don't flicker until the merge lands
      const previous = await firstValueFrom(this.#storage$)
      const previousDTaoRates = Object.fromEntries(
        Object.entries(previous.tokenRates).filter(
          ([tokenId]) => tokens[tokenId]?.type === "substrate-dtao" && !tokenRates[tokenId]
        )
      )
      this.publish({ ...previousDTaoRates, ...tokenRates })

      // merge bittensor dtao (subnet alpha) token rates, computed from the subnet pool
      // prices and the TAO rates above (self-contained failure handling: keep-last, never throws)
      const dtaoRates = await fetchDTaoTokenRatesForWallet(tokens, tokenRates, previous.tokenRates)
      if (Object.keys(dtaoRates).length || Object.keys(previousDTaoRates).length)
        this.publish({ ...tokenRates, ...dtaoRates })
    } catch (err) {
      // reset lastUpdateTokenIds to retry on next call
      this.#lastUpdateKey = ""
      throw err
    }
  }

  /** pushes a rates list to subscribers and the persisted store */
  private publish(tokenRates: TokenRatesStorage["tokenRates"]) {
    const putTokenRates: TokenRatesStorage = { tokenRates }
    Object.values(this.#subscriptions.value).map((cb) => cb(putTokenRates))
    this.#storage$.next(putTokenRates)
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
