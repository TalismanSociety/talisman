import { assign, isEqual, keyBy, values } from "lodash-es"
import {
  combineLatest,
  distinctUntilChanged,
  isObservable,
  map,
  Observable,
  of,
  shareReplay,
} from "rxjs"
import z from "zod/v4"

import { Network, NetworkSchema, Token, TokenSchema } from "../chaindata"
import log from "../log"
import { Chaindata, ChaindataFileSchema, CustomChaindata, CustomChaindataSchema } from "./schema"

const DEFAULT_CUSTOM_CHAINDATA: CustomChaindata = { networks: [], tokens: [] }

export const getCombinedChaindata$ = (
  default$: Observable<Chaindata>,
  custom$: Observable<CustomChaindata> | CustomChaindata | undefined,
  dynamicTokens$: Observable<Token[]>,
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
    }),
  )

  // append valid dynamic tokens to chaindata tokens (they must not be considered custom tokens)
  const defaultChainData$ = combineLatest([default$, dynamicTokens$]).pipe(
    map(([data, dynamicTokens]) => ({
      ...data,
      tokens: values(
        keyBy(
          data.tokens.concat(dynamicTokens.filter((t) => TokenSchema.safeParse(t).success)),
          (t) => t.id,
        ),
      ),
    })),
  )

  // merge custom into default
  return combineLatest({ defaultData: defaultChainData$, customData: customChaindata$ }).pipe(
    map((data) => {
      const start = performance.now()
      const parsed = ChaindataProviderDataSchema.safeParse(data)
      log.debug(
        "[ChaindataProvider] Combined chaindata schema validation: %sms",
        (performance.now() - start).toFixed(2),
      )
      if (!parsed.success) {
        log.error("Failed to parse chaindata provider data", { parsed, data })
        throw new Error("Failed to parse chaindata provider data")
      }
      return parsed.data as Chaindata
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  )
}

/**
 * ⚠️ Hack ⚠️
 * Because Token and Network schemas are unions, zod doesn't allow extending them
 * ChaindataProvider needs to merge default and custom entities, and it turns out that doing it via a zod schema generates the correct output types.
 * So let's take the opportunity and generate the helpper functions we need to leverage those properties
 *
 * Note: ChaindataProvider's consolidated output is the only context where we can safely derive isCustom and isTestnet properties.
 * So these properties should not be declared on the main Token & Network schemas.
 */
const ChaindataProviderDataSchema = z
  .strictObject({
    defaultData: ChaindataFileSchema,
    customData: CustomChaindataSchema,
  })
  .transform(({ defaultData, customData }) => {
    const defaultNetworksById = keyBy(
      defaultData.networks.map((n) => ({ ...n, __isKnown: true, __isCustom: false })),
      (n) => n.id,
    )
    const customNetworksById = keyBy(
      customData.networks?.map((t) => ({
        ...t,
        __isKnown: !!defaultNetworksById[t.id],
        __isCustom: true,
      })),
      (n) => n.id,
    )
    const networksById = assign({}, defaultNetworksById, customNetworksById)

    const defaultTokensById = keyBy(
      defaultData.tokens.map((n) => ({
        ...n,
        __isCustom: false,
        __isKnown: true,
        __isTestnet: !!networksById[n.networkId]?.isTestnet,
      })),
      (n) => n.id,
    )
    const customTokensById = keyBy(
      customData.tokens.map((t) => ({
        ...t,
        __isCustom: true,
        __isKnown: !!defaultTokensById[t.id],
        __isTestnet: !!networksById[t.networkId]?.isTestnet,
      })),
      (n) => n.id,
    )
    const tokensById = assign({}, defaultTokensById, customTokensById)

    return {
      networks: values(networksById),
      tokens: values(tokensById),
      miniMetadatas: defaultData.miniMetadatas,
    }
  })

// these types shouldnt be exported, we only leverage them to generate the helper functions
type ChaindataProviderData = z.infer<typeof ChaindataProviderDataSchema>
type ChaindataProviderNetwork = ChaindataProviderData["networks"][number]
type ChaindataProviderToken = ChaindataProviderData["tokens"][number]

export const isNetworkCustom = (network: Network): boolean => {
  if (typeof network !== "object") return false
  const { __isCustom, __isKnown, ...rest } = network as ChaindataProviderNetwork
  return __isCustom && NetworkSchema.safeParse(rest).success
}

export const isNetworkKnown = (network: Network): boolean => {
  if (typeof network !== "object") return false
  const { __isCustom, __isKnown, ...rest } = network as ChaindataProviderNetwork
  return __isKnown && NetworkSchema.safeParse(rest).success
}

export const isTokenCustom = (token: Token): boolean => {
  if (typeof token !== "object") return false
  const { __isCustom, __isKnown, __isTestnet, ...rest } = token as ChaindataProviderToken
  return __isCustom && TokenSchema.safeParse(rest).success
}

export const isTokenKnown = (token: Token): boolean => {
  if (typeof token !== "object") return false
  const { __isCustom, __isKnown, __isTestnet, ...rest } = token as ChaindataProviderToken
  return __isKnown && TokenSchema.safeParse(rest).success
}

export const isTokenTestnet = (token: Token): boolean => {
  if (typeof token !== "object") return false
  const { __isCustom, __isKnown, __isTestnet, ...rest } = token as ChaindataProviderToken
  return __isTestnet && TokenSchema.safeParse(rest).success
}

export const getCleanNetwork = (network: Network): Network => {
  const { __isCustom, __isKnown, ...rest } = network as ChaindataProviderNetwork
  return rest as Network
}

export const getCleanToken = (token: Token): Token => {
  const { __isCustom, __isKnown, __isTestnet, ...rest } = token as ChaindataProviderToken
  return rest as Token
}
