import { log } from "@common/log"
import type {
  Networks,
  TokenDto,
  YieldDto,
  YieldxyzPosition,
  YieldxyzProvider,
} from "@core/domains/earn/exports"
import {
  getTalismanNetworkIdToYieldxyzNetworkIdMap,
  getYieldxyzNetworkIdToTalismanNetworkIdMap,
} from "@core/domains/earn/exports"
import { bind } from "@react-rxjs/core"
import {
  evmErc20TokenId,
  evmNativeTokenId,
  type Network,
  type NetworkId,
  solNativeTokenId,
  solSplTokenId,
  subNativeTokenId,
} from "@talismn/chaindata-provider"
import { isNotNil, type Loadable } from "@talismn/util"
import { api } from "@ui/api"
import { keyBy } from "lodash-es"
import { combineLatest, map, Observable, ReplaySubject } from "rxjs"

import { getNetworksMapById$ } from "./chaindata"
import { remoteConfig$ } from "./remoteConfig"

export const [useYieldNetworkIdToTalismanNetworkIdMap, yieldNetworkIdToTalismanNetworkIdMap$] =
  bind(remoteConfig$.pipe(map(getYieldxyzNetworkIdToTalismanNetworkIdMap)))

const [_useTalismanNetworkIdFromYieldNetworkId, _getTalismanNetworkIdFromYieldNetworkId$] = bind(
  (yieldNetworkId: Networks | null | undefined) =>
    yieldNetworkIdToTalismanNetworkIdMap$.pipe(
      map((map) => map[yieldNetworkId as Networks] ?? null)
    ),
  null
)

const [_useTalismanNetworkIdToYieldNetworkIdMap, talismanNetworkIdToYieldNetworkIdMap$] = bind(
  remoteConfig$.pipe(map(getTalismanNetworkIdToYieldxyzNetworkIdMap))
)

const [_useYieldNetworkIdFromTalismanNetworkId, _getYieldNetworkIdFromTalismanNetworkId$] = bind(
  (talismanNetworkId: NetworkId | null | undefined) =>
    talismanNetworkIdToYieldNetworkIdMap$.pipe(
      map((map) => map[talismanNetworkId as NetworkId] ?? null)
    ),
  null
)

// Use ReplaySubject to retain cached values across navigations (matches DeFi pattern)
const subjectRawYieldxyzProviders$ = new ReplaySubject<Loadable<YieldxyzProvider[]>>(1)

const rawYieldxyzProviders$ = new Observable<Loadable<YieldxyzProvider[]>>((subscriber) => {
  const sub = subjectRawYieldxyzProviders$.subscribe(subscriber)

  const unsubscribe = api.yieldxyzProvidersSubscribe((loadable: Loadable<YieldxyzProvider[]>) => {
    subjectRawYieldxyzProviders$.next(loadable)
  })

  return () => {
    sub.unsubscribe()
    unsubscribe()
  }
})

export const [useYieldxyzProviders, yieldxyzProviders$] = bind(rawYieldxyzProviders$, {
  status: "loading",
  data: [],
})

const [useYieldxyzProvider, _yieldxyzProvider$] = bind(
  (providerId: string | null | undefined) =>
    yieldxyzProviders$.pipe(
      map((loadable) => {
        if (!providerId)
          return { status: "success", data: null } as Loadable<YieldxyzProvider | null>
        const provider = loadable.data?.find((p) => p.id === providerId) || null
        return { ...loadable, data: provider } as Loadable<YieldxyzProvider | null>
      })
    ),
  { status: "loading", data: null }
)

// Use ReplaySubject to retain cached values across navigations (matches DeFi pattern)
const subjectRawYieldxyzProducts$ = new ReplaySubject<Loadable<YieldDto[]>>(1)

const rawYieldxyzProducts$ = new Observable<Loadable<YieldDto[]>>((subscriber) => {
  const sub = subjectRawYieldxyzProducts$.subscribe(subscriber)

  const unsubscribe = api.yieldxyzProductsSubscribe((loadable: Loadable<YieldDto[]>) => {
    subjectRawYieldxyzProducts$.next(loadable)
  })

  return () => {
    sub.unsubscribe()
    unsubscribe()
  }
})

export const [useYieldxyzProducts, yieldxyzProducts$] = bind(
  combineLatest([
    rawYieldxyzProducts$,
    yieldNetworkIdToTalismanNetworkIdMap$,
    getNetworksMapById$(),
  ]).pipe(
    map(([productsLoadable, yieldNetworkIdToTalismanNetworkIdMap, networksMap]) => {
      return {
        ...productsLoadable,
        data: productsLoadable.data?.filter((product) => {
          const talismanNetworkId = yieldNetworkIdToTalismanNetworkIdMap[product.network]
          if (!talismanNetworkId) return false
          const network = networksMap[talismanNetworkId]
          // Only show products on platforms with working signing support
          return !!network && (network.platform === "ethereum" || network.platform === "solana")
        }),
      }
    })
  ),
  {
    status: "loading",
    data: [],
  }
)

const [useYieldxyzProduct, _yieldxyzProduct$] = bind(
  (yieldId: string | null | undefined) =>
    yieldxyzProducts$.pipe(
      map((loadable) => {
        if (!yieldId) return { status: "success", data: null } as Loadable<YieldDto | null>
        const product = loadable.data?.find((p) => p.id === yieldId) || null
        return { ...loadable, data: product } as Loadable<YieldDto | null>
      })
    ),
  { status: "loading", data: null }
)

// Use ReplaySubject to retain cached values across navigations (matches DeFi pattern)
const subjectRawYieldxyzPositions$ = new ReplaySubject<Loadable<YieldxyzPosition[]>>(1)

const rawYieldxyzPositions$ = new Observable<Loadable<YieldxyzPosition[]>>((subscriber) => {
  const sub = subjectRawYieldxyzPositions$.subscribe(subscriber)

  const unsubscribe = api.yieldxyzPositionsSubscribe((loadable: Loadable<YieldxyzPosition[]>) => {
    subjectRawYieldxyzPositions$.next(loadable)
  })

  return () => {
    sub.unsubscribe()
    unsubscribe()
  }
})

const [useYieldxyzPositionsEnhanced, _yieldxyzPositionsEnhanced$] = bind(
  combineLatest([rawYieldxyzPositions$, rawYieldxyzProducts$]).pipe(
    map(([positionsLoadable, productsLoadable]) => {
      const data =
        positionsLoadable.data && productsLoadable.data
          ? enhanceYieldxyzPositions(positionsLoadable.data, productsLoadable.data)
          : undefined

      // Show cached data immediately — only report "loading" when no data is available
      const status =
        data && data.length > 0
          ? "success"
          : positionsLoadable.status === "loading" || productsLoadable.status === "loading"
            ? "loading"
            : "success"

      return { status, data } as Loadable<YieldxyzPositionEnhanced[]>
    })
  ),
  {
    status: "loading",
    data: [],
  }
)

export type YieldxyzPositionEnhanced = YieldxyzPosition & {
  totalAmountUsd: number
  product: YieldDto
}

const [useYieldxyzTalismanInputTokenIds, _yieldxyzTalismanInputTokenIds$] = bind(
  combineLatest([
    yieldxyzProducts$,
    yieldNetworkIdToTalismanNetworkIdMap$,
    getNetworksMapById$(),
  ]).pipe(
    map(([loadable, yieldNetworkIdToTalismanNetworkIdMap, networksMap]) => {
      if (loadable.status === "loading") return []

      const tokenIds = new Set<string>()
      for (const product of loadable.data ?? []) {
        // if multiple tokens, consider only the native token (no address)
        const inputToken =
          product.inputTokens.length > 1
            ? product.inputTokens.find((t) => !t.address)
            : product.inputTokens[0]
        if (!inputToken) continue

        const tokenId = getYieldxyzTokenId(
          inputToken,
          yieldNetworkIdToTalismanNetworkIdMap,
          networksMap
        )
        if (tokenId) tokenIds.add(tokenId)
      }

      return Array.from(tokenIds)
    })
  ),
  []
)

export const getYieldxyzTokenId = (
  token: TokenDto,
  yieldxyzToTalismanNetworkId: Record<string, string>,
  networksMap: Record<NetworkId, Network>
) => {
  const networkId = yieldxyzToTalismanNetworkId[token.network]
  if (!networkId) return null

  const network = networksMap[networkId]
  if (!network) return null

  switch (network.platform) {
    case "ethereum":
      return token.address
        ? evmErc20TokenId(networkId, token.address as `0x${string}`)
        : evmNativeTokenId(networkId)
    case "polkadot": {
      if (token.symbol === network.nativeCurrency.symbol) return subNativeTokenId(networkId)
      log.warn("Unsupported polkadot token for yieldxyz:", token)
      return null
    }
    case "solana": {
      if (token.address) return solSplTokenId(networkId, token.address)
      if (token.symbol === network.nativeCurrency.symbol) return solNativeTokenId(networkId)
      log.warn("Unsupported solana token for yieldxyz:", token)
      return null
    }
  }
}

const enhanceYieldxyzPositions = (
  positions: YieldxyzPosition[],
  products: YieldDto[]
): YieldxyzPositionEnhanced[] => {
  const productById = keyBy(products, (p) => p.id)

  return positions
    .map((position): YieldxyzPositionEnhanced | null => {
      const product = productById[position.yieldId]
      if (!product) return null

      // ignore the position if no balances
      if (
        !position.balances.filter((b) => {
          // if only a claimable balance without a way to claim, ignore it.
          // happens on some products from provider Upshift
          if (b.type === "claimable" && !b.pendingActions.length) return false

          // TODO identify other non-actionable balance types and ignore them too

          return true
        }).length
      )
        return null

      const totalAmountUsd = position.balances.reduce(
        (sum, b) => sum + parseFloat(b.amountUsd || "0"),
        0
      )

      return { ...position, totalAmountUsd, product }
    })
    .filter(isNotNil)
}

export {
  useYieldxyzProvider,
  useYieldxyzProduct,
  useYieldxyzPositionsEnhanced,
  useYieldxyzTalismanInputTokenIds,
}
