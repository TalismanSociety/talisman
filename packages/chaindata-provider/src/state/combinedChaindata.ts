import {
  arrayItemsEqualWithYield,
  isNotNil,
  keyByWithYield,
  mapWithYield,
  switchMapChunked,
  type TimeSlicer,
} from "@talismn/util"
import { assign, isEqual, values } from "lodash-es"
import {
  combineLatest,
  distinctUntilChanged,
  isObservable,
  type Observable,
  of,
  shareReplay,
} from "rxjs"

import { type Network, type Token, TokenSchema } from "../chaindata"
import log from "../log"
import { parseCustomChaindataChunked } from "./chunkedValidation"
import type { Chaindata, CustomChaindata } from "./schema"

const DEFAULT_CUSTOM_CHAINDATA: CustomChaindata = { networks: [], tokens: [] }

type AnyMiniMetadata = Chaindata["miniMetadatas"][number]

/**
 * Reference stabilization for one section (networks/tokens/miniMetadatas) of the combined
 * chaindata: reuses the previous item reference for items that are deep-equal (matched by
 * id), and returns the exact previous ARRAY reference when nothing changed at all.
 *
 * This is what lets everything downstream compare by reference instead of deep-walking
 * the whole dataset on every emission — ChaindataProvider's distinctUntilKeyChanged
 * relies on it, and consumers keeping per-item references (e.g. balances subscriptions)
 * don't see spurious changes for unrelated tokens.
 */
const makeSectionStabilizer = <T extends { id: string }>() => {
  let prevArray: T[] | null = null
  let prevById: Record<string, T> | null = null

  return async (next: T[], slicer: TimeSlicer): Promise<T[]> => {
    if (prevArray === next) return prevArray

    if (prevArray === null || prevById === null) {
      prevArray = next
      prevById = await keyByWithYield(next, (t) => t.id, { slicer })
      return next
    }

    const previousArray = prevArray
    const previousById = prevById
    let identical = next.length === previousArray.length

    const result = await mapWithYield(
      next,
      (item, index) => {
        const prev = previousById[item.id]
        const stabilized =
          prev !== undefined && (prev === item || isEqual(prev, item)) ? prev : item
        if (identical && previousArray[index] !== stabilized) identical = false
        return stabilized
      },
      { slicer }
    )

    if (identical) return previousArray
    prevArray = result
    prevById = await keyByWithYield(result, (t) => t.id, { slicer })
    return result
  }
}

export const getCombinedChaindata$ = (
  default$: Observable<Chaindata>,
  custom$: Observable<CustomChaindata> | CustomChaindata | undefined,
  dynamicTokens$: Observable<Token[]>
): Observable<Chaindata> => {
  // ensure custom$ is an observable
  if (!custom$) custom$ = of(DEFAULT_CUSTOM_CHAINDATA)
  if (!isObservable(custom$)) custom$ = of(custom$)

  // check custom one against schema (chunked — validation yields the thread on budget)
  let prevCustom: CustomChaindata | null = null
  const customChaindata$ = custom$.pipe(
    switchMapChunked(async (data, { slicer }) => {
      const result = await parseCustomChaindataChunked(data, { slicer })
      if (!result.success) log.error("Invalid custom chaindata provided", result.error)
      const next = result.success ? result.data : DEFAULT_CUSTOM_CHAINDATA

      // reference stabilization: reuse the previous object when content is unchanged, so
      // the distinctUntilChanged below dedupes by reference
      if (
        prevCustom !== null &&
        (await arrayItemsEqualWithYield(prevCustom.networks, next.networks, { slicer })) &&
        (await arrayItemsEqualWithYield(prevCustom.tokens, next.tokens, { slicer }))
      )
        return prevCustom

      prevCustom = next
      return next
    }),
    distinctUntilChanged()
  )

  // append valid dynamic tokens to chaindata tokens (they must not be considered custom tokens)
  const defaultChainData$ = combineLatest([default$, dynamicTokens$]).pipe(
    switchMapChunked(async ([data, dynamicTokens], { slicer }) => {
      const validDynamicTokens = (
        await mapWithYield(
          dynamicTokens,
          (t) => {
            const result = TokenSchema.safeParse(t)
            return result.success ? result.data : null
          },
          { slicer }
        )
      ).filter(isNotNil)

      const tokensById = await keyByWithYield(data.tokens.concat(validDynamicTokens), (t) => t.id, {
        slicer,
      })

      return { ...data, tokens: values(tokensById) }
    })
  )

  const stabilizeNetworks = makeSectionStabilizer<Network>()
  const stabilizeTokens = makeSectionStabilizer<Token>()
  const stabilizeMiniMetadatas = makeSectionStabilizer<AnyMiniMetadata>()
  let prevCombined: Chaindata | null = null

  // merge custom into default
  return combineLatest({ defaultData: defaultChainData$, customData: customChaindata$ }).pipe(
    switchMapChunked(async (data, { slicer }) => {
      const start = performance.now()
      const merged = await mergeDefaultAndCustomChaindata(data.defaultData, data.customData, slicer)

      const networks = await stabilizeNetworks(merged.networks as Network[], slicer)
      const tokens = await stabilizeTokens(merged.tokens as Token[], slicer)
      const miniMetadatas = await stabilizeMiniMetadatas(merged.miniMetadatas, slicer)

      const result: Chaindata =
        prevCombined !== null &&
        prevCombined.networks === networks &&
        prevCombined.tokens === tokens &&
        prevCombined.miniMetadatas === miniMetadatas
          ? prevCombined
          : { networks, tokens, miniMetadatas }
      prevCombined = result

      log.debug(
        "[ChaindataProvider] Combined chaindata merge: %sms",
        (performance.now() - start).toFixed(2)
      )
      return result
    }),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  )
}

/**
 * Merges default and custom chaindata, adding __isCustom, __isKnown, __isTestnet flags.
 *
 * Input data is already validated by upstream observables (storageValidated$ for default,
 * customChaindata$ pipe for custom). This is a pure data transformation, chunked so it
 * yields the thread to the host event loop on budget.
 */
const mergeDefaultAndCustomChaindata = async (
  defaultData: Chaindata,
  customData: CustomChaindata,
  slicer: TimeSlicer
) => {
  const defaultNetworksById = await keyByWithYield(
    await mapWithYield(
      defaultData.networks,
      (n) => ({ ...n, __isKnown: true, __isCustom: false }),
      {
        slicer,
      }
    ),
    (n) => n.id,
    { slicer }
  )
  const customNetworksById = await keyByWithYield(
    await mapWithYield(
      customData.networks ?? [],
      (t) => ({ ...t, __isKnown: !!defaultNetworksById[t.id], __isCustom: true }),
      { slicer }
    ),
    (n) => n.id,
    { slicer }
  )
  const networksById = assign({}, defaultNetworksById, customNetworksById)

  const defaultTokensById = await keyByWithYield(
    await mapWithYield(
      defaultData.tokens,
      (n) => ({
        ...n,
        __isCustom: false,
        __isKnown: true,
        __isTestnet: !!networksById[n.networkId]?.isTestnet,
      }),
      { slicer }
    ),
    (n) => n.id,
    { slicer }
  )
  const customTokensById = await keyByWithYield(
    await mapWithYield(
      customData.tokens,
      (t) => ({
        ...t,
        __isCustom: true,
        __isKnown: !!defaultTokensById[t.id],
        __isTestnet: !!networksById[t.networkId]?.isTestnet,
      }),
      { slicer }
    ),
    (n) => n.id,
    { slicer }
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
