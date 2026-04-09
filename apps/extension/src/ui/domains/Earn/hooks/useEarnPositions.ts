import type { DefiPosition } from "@core/domains/defi/exports"
import type { TokenDto, YieldxyzProvider } from "@core/domains/earn/exports"
import type { Network, NetworkId, TokenId } from "@talismn/chaindata-provider"
import type { TokenRatesList } from "@talismn/token-rates"
import { isNotNil, type Loadable } from "@talismn/util"
import { useNetworksMapById, useTokensMap } from "@ui/state/chaindata"
import { useDefiPositions } from "@ui/state/defi"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import type { YieldxyzPositionEnhanced } from "@ui/state/yieldxyz"
import { useYieldxyzPositionsEnhanced, useYieldxyzProviders } from "@ui/state/yieldxyz"
import { keyBy } from "lodash-es"
import { useMemo } from "react"

import { calcDefiItemValueUsd, resolveDefiTokenId } from "../defi/useDefiItemValueUsd"
import { useGetYieldxyzToken } from "../yieldxyz/hooks/useGetYieldxyzToken"

export type EarnPositionDisplayToken = {
  tokenId: TokenId | null
  symbol: string
  logoUrl: string | null
}

export type EarnPosition = {
  id: string
  address: string
  networkId: string | null
  logoUrl: string | null
  providerName: string
  title: string
  type: string | null
  isReadOnly: boolean
  displayTokens: EarnPositionDisplayToken[]
  totalAmountUsd: number
  detailUrl: string
  tokenIds: TokenId[]
  searchTerms: string[]
}

const PRIMARY_DEFI_ITEM_TYPES = new Set(["deposit", "loan", "locked", "staked", "margin"])

const mapYieldPosition = (
  yp: YieldxyzPositionEnhanced,
  getYieldxyzTokenId: (token: TokenDto) => string | null,
  tokensMap: Record<string, unknown>,
  provider: YieldxyzProvider | undefined
): EarnPosition | null => {
  const tokenIds = yp.product.inputTokens
    .map((token) => getYieldxyzTokenId(token))
    .filter(isNotNil)
    .filter((id) => !!tokensMap[id])

  if (!tokenIds.length) return null

  // Collect all tokens for display (input + output + balance tokens), deduplicated
  const allTokens = [
    ...yp.product.inputTokens,
    ...(yp.product.outputToken ? [yp.product.outputToken] : []),
    ...yp.balances.map((b) => b.token),
  ]

  const displayTokens: EarnPositionDisplayToken[] = []
  const seen = new Set<string>()
  for (const token of allTokens) {
    const tokenId = getYieldxyzTokenId(token)
    const key = tokenId ?? token.symbol
    if (seen.has(key)) continue
    if (tokenId && !tokensMap[tokenId]) continue
    seen.add(key)
    displayTokens.push({ tokenId, symbol: token.symbol, logoUrl: token.logoURI ?? null })
  }
  displayTokens.sort((a, b) => (a.tokenId ?? a.symbol).localeCompare(b.tokenId ?? b.symbol))

  return {
    id: `yieldxyz-${yp.yieldId}-${yp.address}`,
    address: yp.address,
    networkId: yp.networkId,
    logoUrl: provider?.logoURI ?? null,
    providerName: provider?.name ?? yp.product.providerId,
    title: yp.product.metadata.name,
    type: yp.product.mechanics?.type ?? null,
    isReadOnly: false,
    displayTokens,
    totalAmountUsd: yp.totalAmountUsd,
    detailUrl: `/earn/positions/yieldxyz/${encodeURIComponent(yp.yieldId)}/${encodeURIComponent(yp.address)}`,
    tokenIds,
    searchTerms: [
      yp.product.metadata.name,
      yp.product.providerId,
      provider?.name ?? "",
      ...(yp.product.tags ?? []),
      ...yp.balances.map((b) => b.token.symbol),
      ...yp.balances.map((b) => b.token.name),
    ],
  }
}

const mapDefiPosition = (
  dp: DefiPosition,
  networksMap: Record<NetworkId, Network>,
  tokensMap: Record<string, unknown>,
  tokenRatesMap: TokenRatesList
): EarnPosition | null => {
  const primaryItems = dp.breakdown.filter((item) => PRIMARY_DEFI_ITEM_TYPES.has(item.type))
  const groupingItems = primaryItems.length ? primaryItems : dp.breakdown

  const tokenIds = [
    ...new Set(
      groupingItems
        .map((item) =>
          resolveDefiTokenId(dp.networkId, item.contract_address, networksMap, tokensMap)
        )
        .filter(isNotNil)
    ),
  ]

  if (!tokenIds.length) return null

  // Build display tokens from non-reward breakdown items, deduplicated
  const displayItems = dp.breakdown.filter((item) => !["reward", "airdrop"].includes(item.type))
  const displayTokens: EarnPositionDisplayToken[] = []
  const seen = new Set<string>()
  for (const item of displayItems.length ? displayItems : dp.breakdown) {
    const tokenId = resolveDefiTokenId(dp.networkId, item.contract_address, networksMap, tokensMap)
    const key = tokenId ?? item.symbol
    if (seen.has(key)) continue
    seen.add(key)
    displayTokens.push({ tokenId, symbol: item.symbol, logoUrl: item.logo })
  }

  const totalAmountUsd = dp.breakdown.reduce(
    (sum, item) =>
      sum + calcDefiItemValueUsd(item, dp.networkId, networksMap, tokensMap, tokenRatesMap),
    0
  )

  return {
    id: `defi-${dp.id}`,
    address: dp.address,
    networkId: dp.networkId,
    logoUrl: dp.defiLogoUrl,
    providerName: dp.defiName,
    title: dp.name,
    type: dp.type,
    isReadOnly: true,
    displayTokens,
    totalAmountUsd,
    detailUrl: `/earn/positions/defi/${encodeURIComponent(dp.id)}`,
    tokenIds,
    searchTerms: [
      dp.name,
      dp.defiName,
      dp.symbol ?? "",
      ...dp.breakdown.map((b) => b.symbol),
      ...dp.breakdown.map((b) => b.name),
    ],
  }
}

export const useEarnPositions = (): Loadable<EarnPosition[]> => {
  const { status: yieldStatus, data: yieldPositions } = useYieldxyzPositionsEnhanced()
  const { status: defiStatus, data: defiPositions } = useDefiPositions()
  const { data: providers } = useYieldxyzProviders()
  const { getYieldxyzTokenId } = useGetYieldxyzToken()
  const tokensMap = useTokensMap()
  const networksMap = useNetworksMapById()
  const tokenRatesMap = useTokenRatesMap()

  const providerByKey = useMemo(() => keyBy(providers ?? [], (p) => p.id), [providers])

  const positions = useMemo(() => {
    const result: EarnPosition[] = []

    for (const yp of yieldPositions ?? []) {
      const mapped = mapYieldPosition(
        yp,
        getYieldxyzTokenId,
        tokensMap,
        providerByKey[yp.product.providerId]
      )
      if (mapped) result.push(mapped)
    }

    for (const dp of defiPositions ?? []) {
      const mapped = mapDefiPosition(dp, networksMap, tokensMap, tokenRatesMap)
      if (mapped) result.push(mapped)
    }

    return result
  }, [
    yieldPositions,
    defiPositions,
    providerByKey,
    getYieldxyzTokenId,
    tokensMap,
    networksMap,
    tokenRatesMap,
  ])

  // Show cached data immediately — only report "loading" when no positions are available
  const isAnyLoading = yieldStatus === "loading" || defiStatus === "loading"
  const isAnyError = yieldStatus === "error" || defiStatus === "error"

  const status =
    positions.length > 0 ? "success" : isAnyLoading ? "loading" : isAnyError ? "error" : "success"

  return useMemo(
    () => ({ status, data: positions }) as Loadable<EarnPosition[]>,
    [status, positions]
  )
}
