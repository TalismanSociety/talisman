import { COINS_API_URL } from "@common/constants"
import { log } from "@common/log"
import {
  isTokenIdOfType,
  type Network,
  type TokenId,
  type TokenList,
} from "@talismn/chaindata-provider"
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

/** carried dtao rates whose token id stays out of the active token list longer than this are pruned */
const DTAO_RATES_CARRY_TTL = 24 * 3_600_000

type TokenRatesStoreData = TokenRatesStorage & {
  /** when each carried dtao rate was first seen missing from the active token list */
  dtaoCarriedSince?: Record<TokenId, number>
}

const blobStore = getBlobStore<TokenRatesStoreData>("tokenRates")

const DEFAULT_TOKEN_RATES: TokenRatesStoreData = { tokenRates: {} }
const tokenRates$ = new ReplaySubject<TokenRatesStoreData>(1)
// persist changes to disk
tokenRates$
  .pipe(debounceTime(2_000), distinctUntilChanged<TokenRatesStoreData>(isEqual))
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
  #storage$: ReplaySubject<TokenRatesStoreData>

  #lastUpdateKey = ""
  #lastUpdateAt = Date.now() // will prevent a first empty call if tokens aren't loaded yet
  // updates are not serialized: a newer update (network toggle, currency change) can start while
  // an older one awaits its fetches — stale publishes must not clobber the newer rates
  #updateGeneration = 0
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

    const generation = ++this.#updateGeneration

    try {
      // force usd to be included, because hide small balances feature requires it
      const allCurrencyIds: TokenRateCurrency[] = [...currencies, "usd", "tao"]
      const effectiveCurrencyIds = uniq(allCurrencyIds)

      const tokenRates = await fetchTokenRates(tokens, effectiveCurrencyIds, {
        apiUrl: COINS_API_URL,
      })

      // publish the fresh rates immediately — the dtao fetch below (bittensor RPC + tao-data
      // api) must not delay rates for the rest of the wallet. previous dtao entries are
      // carried over so alpha fiat values don't flicker until the merge lands.
      // carry is keyed on the token ID shape, NOT on membership in `tokens`: during startup
      // the active token list re-emits repeatedly (dynamic token registration, chaindata
      // hydration) and a dtao id transiently missing from it must not lose its rate — a
      // published rates set without it zeroes the row's fiat and the row falls out of the
      // portfolio's rendered range for a beat (visible flap).
      // unlisted ids are stamped and carried within a grace window only (covers the startup
      // churn by orders of magnitude), then pruned: truly-gone ids (eg bittensor network
      // deactivated, orphaned entries) must not pile up in the store forever
      const previous = await firstValueFrom(this.#storage$)
      const prevStamps = previous.dtaoCarriedSince ?? {}
      const dtaoCarriedSince: Record<TokenId, number> = {}
      const previousDTaoRates: TokenRatesStorage["tokenRates"] = {}
      for (const [tokenId, rates] of Object.entries(previous.tokenRates)) {
        if (!isTokenIdOfType(tokenId, "substrate-dtao") || tokenRates[tokenId]) continue
        if (!tokens[tokenId]) {
          const since = prevStamps[tokenId] ?? now
          if (now - since > DTAO_RATES_CARRY_TTL) continue
          dtaoCarriedSince[tokenId] = since
        }
        previousDTaoRates[tokenId] = rates
      }
      if (generation !== this.#updateGeneration) return
      this.publish({ ...previousDTaoRates, ...tokenRates }, dtaoCarriedSince)

      // merge bittensor dtao (subnet alpha) token rates, computed from the subnet pool
      // prices and the TAO rates above (self-contained failure handling: keep-last, never throws)
      const dtaoRates = await fetchDTaoTokenRatesForWallet(tokens, tokenRates, previous.tokenRates)
      if (generation !== this.#updateGeneration) return
      // previousDTaoRates stays in the merge: the fetch only re-prices dtao tokens present in
      // the current list, and entries it did not cover must survive this publish too (an empty
      // fetch result must never regress the carried entries published above)
      if (Object.keys(dtaoRates).length)
        this.publish({ ...previousDTaoRates, ...tokenRates, ...dtaoRates }, dtaoCarriedSince)
    } catch (err) {
      // reset lastUpdateTokenIds to retry on next call
      this.#lastUpdateKey = ""
      throw err
    }
  }

  /** pushes a rates list to subscribers and the persisted store (carry stamps stay internal) */
  private publish(
    tokenRates: TokenRatesStorage["tokenRates"],
    dtaoCarriedSince?: Record<TokenId, number>
  ) {
    Object.values(this.#subscriptions.value).map((cb) => cb({ tokenRates }))
    this.#storage$.next({ tokenRates, dtaoCarriedSince })
  }

  public async subscribe(id: string, port: Port, unsubscribeCallback?: () => void) {
    const cb = createSubscription<"pri(tokenRates.subscribe)">(id, port)
    const { tokenRates } = await firstValueFrom(this.#storage$)
    cb({ tokenRates })

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
