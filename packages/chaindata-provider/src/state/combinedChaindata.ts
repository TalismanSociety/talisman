import { assign, isEqual, keyBy, values } from "lodash-es"
import {
  combineLatest,
  distinctUntilChanged,
  isObservable,
  map,
  type Observable,
  of,
  shareReplay,
} from "rxjs"

import { type Network, type Token, TokenSchema } from "../chaindata"
import log from "../log"
import { type Chaindata, type CustomChaindata, CustomChaindataSchema } from "./schema"

const DEFAULT_CUSTOM_CHAINDATA: CustomChaindata = { networks: [], tokens: [] }

export const getCombinedChaindata$ = (
  default$: Observable<Chaindata>,
  custom$: Observable<CustomChaindata> | CustomChaindata | undefined,
  dynamicTokens$: Observable<Token[]>
): Observable<Chaindata> => {
  // ensure custom$ is an observable
  if (!custom$) custom$ = of(DEFAULT_CUSTOM_CHAINDATA)
  if (!isObservable(custom$)) custom$ = of(custom$)

  // check custom one against schema
  const customChaindata$ = (custom$ ?? of(DEFAULT_CUSTOM_CHAINDATA)).pipe(
    distinctUntilChanged(isEqual),
    map((data) => {
      const result = CustomChaindataSchema.safeParse(data)
      if (!result.success) log.error("Invalid custom chaindata provided", result.error)
      return result.success ? result.data : DEFAULT_CUSTOM_CHAINDATA
    })
  )

  // append valid dynamic tokens to chaindata tokens (they must not be considered custom tokens)
  const defaultChainData$ = combineLatest([default$, dynamicTokens$]).pipe(
    map(([data, dynamicTokens]) => ({
      ...data,
      tokens: values(
        keyBy(
          data.tokens.concat(
            dynamicTokens.flatMap((t) => {
              const result = TokenSchema.safeParse(t)
              return result.success ? [result.data] : []
            })
          ),
          (t) => t.id
        )
      ),
    }))
  )

  // merge custom into default
  return combineLatest({ defaultData: defaultChainData$, customData: customChaindata$ }).pipe(
    map((data) => {
      const start = performance.now()
      const result = mergeDefaultAndCustomChaindata(data.defaultData, data.customData)
      log.debug(
        "[ChaindataProvider] Combined chaindata merge: %sms",
        (performance.now() - start).toFixed(2)
      )
      return result as Chaindata
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  )
}

/**
 * Merges default and custom chaindata, adding __isCustom, __isKnown, __isTestnet flags.
 *
 * Input data is already validated by upstream observables (storageValidated$ for default,
 * customChaindata$ pipe for custom). This is a pure data transformation.
 */
const mergeDefaultAndCustomChaindata = (defaultData: Chaindata, customData: CustomChaindata) => {
  const defaultNetworksById = keyBy(
    defaultData.networks.map((n) => ({ ...n, __isKnown: true, __isCustom: false })),
    (n) => n.id
  )
  const customNetworksById = keyBy(
    customData.networks?.map((t) => ({
      ...t,
      __isKnown: !!defaultNetworksById[t.id],
      __isCustom: true,
    })),
    (n) => n.id
  )
  const networksById = assign({}, defaultNetworksById, customNetworksById)

  const defaultTokensById = keyBy(
    defaultData.tokens.map((n) => ({
      ...n,
      __isCustom: false,
      __isKnown: true,
      __isTestnet: !!networksById[n.networkId]?.isTestnet,
    })),
    (n) => n.id
  )
  const customTokensById = keyBy(
    customData.tokens.map((t) => ({
      ...t,
      __isCustom: true,
      __isKnown: !!defaultTokensById[t.id],
      __isTestnet: !!networksById[t.networkId]?.isTestnet,
    })),
    (n) => n.id
  )
  const tokensById = assign({}, defaultTokensById, customTokensById)

  return {
    networks: values(networksById),
    tokens: values(tokensById),
    miniMetadatas: defaultData.miniMetadatas,
  }
}

// Types for the merged chaindata with __isCustom/__isKnown/__isTestnet flags.
// Previously inferred from ChaindataProviderDataSchema via z.infer.
type ChaindataProviderNetwork = Network & { __isCustom: boolean; __isKnown: boolean }
type ChaindataProviderToken = Token & {
  __isCustom: boolean
  __isKnown: boolean
  __isTestnet: boolean
}

// Flag checks only — no Zod safeParse. All data is already validated upstream:
// - Default chaindata: validated by ChaindataFileSchema in storageValidated$ / fetchChaindata()
// - Custom chaindata: validated by CustomChaindataSchema in the customChaindata$ pipe
// - Dynamic tokens: validated by TokenSchema.safeParse in the defaultChainData$ pipe
export const isNetworkCustom = (network: Network): boolean =>
  typeof network === "object" && (network as ChaindataProviderNetwork).__isCustom === true

export const isNetworkKnown = (network: Network): boolean =>
  typeof network === "object" && (network as ChaindataProviderNetwork).__isKnown === true

export const isTokenCustom = (token: Token): boolean =>
  typeof token === "object" && (token as ChaindataProviderToken).__isCustom === true

export const isTokenKnown = (token: Token): boolean =>
  typeof token === "object" && (token as ChaindataProviderToken).__isKnown === true

export const isTokenTestnet = (token: Token): boolean =>
  typeof token === "object" && (token as ChaindataProviderToken).__isTestnet === true

export const getCleanNetwork = (network: Network): Network => {
  const { __isCustom, __isKnown, ...rest } = network as ChaindataProviderNetwork
  return rest as Network
}

export const getCleanToken = (token: Token): Token => {
  const { __isCustom, __isKnown, __isTestnet, ...rest } = token as ChaindataProviderToken
  return rest as Token
}
