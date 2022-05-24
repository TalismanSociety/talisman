import { map, combineLatest } from "rxjs"
import { SubscribableByIdStorageProvider } from "@core/libs/Store"
import {
  TokenId,
  Token,
  TokenList,
  Port,
  RequestIdOnly,
  SubscriptionCallback,
  UnsubscribeFn,
} from "@core/types"
import { settingsStore } from "@core/domains/app"
import { createSubscription, unsubscribe } from "@core/handlers/subscriptions"
import pick from "lodash/pick"
import { print } from "graphql"
import gql from "graphql-tag"
import { DEBUG } from "@core/constants"

const storageKey = "tokens"
const graphqlUrl = "https://app.gc.subsquid.io/beta/chaindata/latest/graphql"
const minimumHydrationInterval = 300_000 // 300_000ms = 300s = 5 minutes

// TODO: Separate chains and tokens more nicely so that we don't need to store chain info like `isTestnet` inside the tokens store
type TokenStoreToken = Token & { isTestnet: boolean }
type TokenStoreList = Record<TokenId, TokenStoreToken>

export class TokenStore extends SubscribableByIdStorageProvider<
  TokenStoreList,
  "pri(tokens.subscribe)",
  "pri(tokens.byid.subscribe)"
> {
  #lastHydratedAt: number = 0

  /**
   * Fetch or subscribe to tokens by tokenId.
   *
   * @param tokenIds - Optional filter for tokens by tokenId.
   * @param callback - Optional subscription callback.
   * @returns Either a `TokenList`, or an unsubscribe function if the `callback` parameter was given.
   */
  async tokens(tokenIds?: TokenId[]): Promise<TokenList>
  async tokens(
    tokenIds: TokenId[],
    callback: SubscriptionCallback<TokenList>
  ): Promise<UnsubscribeFn>
  async tokens(
    tokenIds?: TokenId[],
    callback?: SubscriptionCallback<TokenList>
  ): Promise<TokenList | UnsubscribeFn> {
    await this.hydrateStore()

    // subscription request
    if (callback !== undefined) {
      // create filter observable (allows subscriber to be informed when useTestnets changes)
      const tokenFilterObservable = settingsStore.observable.pipe(
        map(({ useTestnets }) =>
          composeFilters(tokenIdsFilter(tokenIds), testnetFilter(useTestnets))
        )
      )

      // subscribe to tokens
      const subscription = combineLatest([this.observable, tokenFilterObservable]).subscribe({
        next: ([tokens, tokenFilter]) => callback(null, tokenFilter(tokens)),
        error: (error) => callback(error),
      })

      // return unsubscribe function
      return subscription.unsubscribe.bind(subscription)
    }

    // once-off request
    const tokens = await this.get()
    const useTestnets = await settingsStore.get("useTestnets")
    const tokenFilter = composeFilters(tokenIdsFilter(tokenIds), testnetFilter(useTestnets))
    return tokenFilter(tokens)
  }

  /**
   * Fetch or subscribe to a single token by tokenId.
   *
   * @param tokenId - The token to fetch or subscribe to.
   * @param callback - Optional subscription callback.
   * @returns Either a `Token`, or an unsubscribe function if the `callback` parameter was given.
   */
  async token(tokenId: TokenId): Promise<Token | undefined>
  async token(
    tokenId: TokenId,
    callback: SubscriptionCallback<Token | undefined>
  ): Promise<UnsubscribeFn>
  async token(
    tokenId: TokenId,
    callback?: SubscriptionCallback<Token | undefined>
  ): Promise<Token | undefined | UnsubscribeFn> {
    // subscription request
    if (callback !== undefined) {
      const innerCallback: SubscriptionCallback<TokenList> = (error, tokens) => {
        if (error !== null) return callback(error)
        if (tokens === undefined)
          return callback(new Error(`No tokens returned in request for token ${tokenId}`))
        callback(null, tokens[tokenId])
      }

      return await this.tokens([tokenId], innerCallback)
    }

    // once-off request
    return (await this.tokens([tokenId]))[tokenId]
  }

  public subscribe(id: string, port: Port, unsubscribeCallback?: () => void): boolean {
    const cb = createSubscription<"pri(tokens.subscribe)">(id, port)

    // TODO: Make this.tokens into `this.observable` so we can use subscribe method from StorageProvider
    const subscription = this.tokens([], (error, tokens) => !error && tokens && cb(tokens))

    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      subscription.then((unsubscribe) => unsubscribe())
      if (unsubscribeCallback) unsubscribeCallback()
    })

    return true
  }

  public subscribeById(
    id: string,
    port: Port,
    request: RequestIdOnly,
    unsubscribeCallback?: () => void
  ): boolean {
    const cb = createSubscription<"pri(tokens.byid.subscribe)">(id, port)

    // TODO: Make this.tokens into `this.observable` so we can use subscribeById method from StorageProvider
    const subscription = this.token(request.id, (error, token) => !error && token && cb(token))

    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      subscription.then((unsubscribe) => unsubscribe())
      if (unsubscribeCallback) unsubscribeCallback()
    })

    return true
  }

  /**
   * Hydrate the store with the latest tokens from subsquid.
   * Hydration is skipped when the last successful hydration was less than minimumHydrationInterval ms ago.
   *
   * @returns A promise which resolves to true if the store has been hydrated, or false if the hydration was skipped.
   */
  private async hydrateStore(): Promise<boolean> {
    const now = Date.now()
    if (now - this.#lastHydratedAt < minimumHydrationInterval) return false

    try {
      const { data } = await (
        await fetch(graphqlUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: print(tokensQuery) }),
        })
      ).json()

      const tokensList = tokensResponseToTokenList(data?.tokens || [])

      if (Object.keys(tokensList).length <= 0)
        throw new Error("Ignoring empty chaindata tokens response")

      this.replace(tokensList)
      this.#lastHydratedAt = now

      return true
    } catch (error) {
      // eslint-disable-next-line no-console
      DEBUG && console.error(error)

      return false
    }
  }
}

const composeFilters =
  (...filters: Array<(tokens: TokenStoreList) => TokenStoreList>) =>
  (tokens: TokenStoreList): TokenStoreList =>
    filters.reduce((composed, filter) => filter(composed), tokens)

const testnetFilter = (useTestnets: boolean) =>
  !useTestnets
    ? // Filter by !isTestnet
      (tokens: TokenStoreList) =>
        Object.fromEntries(
          Object.values(tokens)
            .filter(({ isTestnet }) => !isTestnet)
            .map((token) => [token.id, token])
        )
    : // Don't filter
      (tokens: TokenStoreList) => tokens

const tokenIdsFilter = (tokenIds?: TokenId[]) =>
  Array.isArray(tokenIds) && tokenIds.length > 0
    ? // Filter by tokenId
      (tokens: TokenStoreList) => pick(tokens, tokenIds)
    : // Don't filter
      (tokens: TokenStoreList) => tokens

/**
 * Helper function to convert tokensQuery response into a `TokenStoreList`.
 */
const tokensResponseToTokenList = (tokens: Array<any>): TokenStoreList => {
  return Object.fromEntries(
    tokens
      .flatMap((chainToken) => [
        {
          ...chainToken?.nativeToken,
          type: "native",
          chainId: chainToken?.id,
          isTestnet: chainToken?.isTestnet || false,
        },
        ...(chainToken?.tokens || []).map((ormlToken: any) => ({
          ...ormlToken,
          type: "orml",
          chainId: chainToken?.id,
          isTestnet: chainToken?.isTestnet || false,
        })),
      ])
      .map((token) => [token.id, token])
  )
}

const tokensQuery = gql`
  {
    tokens: chains(orderBy: sortIndex_ASC) {
      id
      isTestnet
      nativeToken {
        id
        token
        symbol
        decimals
        existentialDeposit
        coingeckoId
        rates {
          usd
          eur
        }
      }
      tokens {
        id
        index
        token
        symbol
        decimals
        existentialDeposit
        coingeckoId
        rates {
          usd
          eur
        }
      }
    }
  }
`

const tokenStore = new TokenStore(storageKey)
export default tokenStore
