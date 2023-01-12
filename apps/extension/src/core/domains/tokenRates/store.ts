import { db } from "@core/db"
import { unsubscribe } from "@core/handlers/subscriptions"
import { log } from "@core/log"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { Port } from "@core/types/base"
import { TokenList } from "@talismn/chaindata-provider"
import { fetchTokenRates } from "@talismn/token-rates"
import { Subscription, liveQuery } from "dexie"
import { default as debounce } from "lodash/debounce"
import { BehaviorSubject } from "rxjs"

const MIN_REFRESH_INTERVAL = 60_000 // 60_000ms = 60s = 1 minute
const REFRESH_INTERVAL = 300_000 // 5 minutes

export class TokenRatesStore {
  #lastUpdateTokenIds = ""
  #lastUpdateAt = Date.now() // will prevent a first empty call if tokens aren't loaded yet
  #subscriptions = new BehaviorSubject<string[]>([])
  #isWatching = false

  constructor() {
    this.watchSubscriptions()
  }

  /**
   * Toggles on & off the price updates, based on if there are any active subscriptions
   */
  private watchSubscriptions = (): void => {
    let pollInterval: NodeJS.Timer | null = null
    let subTokenList: Subscription | null = null

    this.#subscriptions.subscribe((subscriptions: string[]) => {
      if (subscriptions.length) {
        // watching state check
        if (this.#isWatching) return
        this.#isWatching = true

        // refresh price every minute if observed
        pollInterval = setInterval(() => {
          if (this.#subscriptions.observed) this.hydrateStore()
        }, REFRESH_INTERVAL)

        // refresh when token list changes : crucial for first popup load after install or db migration
        const obsTokens = liveQuery(() => chaindataProvider.tokens())
        subTokenList = obsTokens.subscribe(
          debounce(async (tokens) => {
            if (this.#subscriptions.observed) await this.updateTokenRates(tokens)
          }, 500) // debounce to delay in case on first load first token list is empty
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
      const tokens = await chaindataProvider.tokens()
      await this.updateTokenRates(tokens)

      return true
    } catch (error) {
      log.error(`Failed to fetch tokenRates`, error)
      return false
    }
  }

  private async updateTokenRates(tokens: TokenList): Promise<void> {
    const now = Date.now()
    const strTokenIds = Object.keys(tokens ?? {}).join(",")
    if (now - this.#lastUpdateAt < MIN_REFRESH_INTERVAL && this.#lastUpdateTokenIds === strTokenIds)
      return

    // update lastUpdateAt & lastUpdateTokenIds before fetching to prevent api call bursts
    this.#lastUpdateAt = now
    this.#lastUpdateTokenIds = strTokenIds

    try {
      const tokenRates = await fetchTokenRates(tokens)

      await db.transaction("rw", db.tokenRates, async (tx) => {
        // override all tokenRates
        await db.tokenRates.bulkPut(
          Object.entries(tokenRates).map(([tokenId, tokenRates]) => ({
            tokenId,
            rates: tokenRates,
          }))
        )

        // delete tokenRates for tokens which no longer exist
        const tokenIds = await db.tokenRates.toCollection().primaryKeys()
        if (tokenIds.length)
          await db.tokenRates.bulkDelete(
            tokenIds.filter((tokenId) => tokens[tokenId] === undefined)
          )
      })
    } catch (err) {
      // reset lastUpdateTokenIds to retry on next call
      this.#lastUpdateTokenIds = ""
      throw err
    }
  }

  public subscribe(id: string, port: Port): void {
    this.#subscriptions.next([...this.#subscriptions.value, id])

    this.hydrateStore()

    // close subscription
    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      this.#subscriptions.next(this.#subscriptions.value.filter((subId) => subId !== id))
    })
  }
}

export const tokenRatesStore = new TokenRatesStore()
