import type { TokenDto, YieldDto, YieldxyzProvider } from "@core/domains/earn/exports"
import { parseTokenId, type TokenId } from "@talismn/chaindata-provider"
import { LockIcon } from "@talismn/icons"
import { isNotNil } from "@talismn/util"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useTokensMap } from "@ui/state/chaindata"
import {
  useYieldxyzPositionsEnhanced,
  useYieldxyzProducts,
  useYieldxyzProviders,
  type YieldxyzPositionEnhanced,
} from "@ui/state/yieldxyz"
import { cn } from "@ui/util/cn"
import { keyBy } from "lodash-es"
import { type FC, type PropsWithChildren, type ReactNode, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type {
  EarnOpportunity,
  EarnPosition,
  EarnPositionDisplayToken,
  EarnProvider,
} from "../types"
import { YieldxyzProductYieldDisplay } from "../yieldxyz/components/YieldxyzProductYieldDisplay"
import { YieldxyzProviderLogo } from "../yieldxyz/components/YieldxyzProviderLogo"
import { useYieldxyzEnterModal } from "../yieldxyz/enter/useYieldxyzEnterModal"
import { useGetYieldxyzToken } from "../yieldxyz/hooks/useGetYieldxyzToken"
import { asEarnSystemStatus } from "./status"
import type { EarnActionOpener, EarnSystem } from "./types"

const MIN_REWARD_RATE = 0.001
const ALLOW_NO_STATISTICS = true

// a yield.xyz opportunity carries its source product so the picker/enter wizard can read it back
export type YieldxyzEarnOpportunity = EarnOpportunity & {
  product: YieldDto
}

const isEnterableYieldProduct = (product: YieldDto) =>
  product.status.enter &&
  product.rewardRate.total >= MIN_REWARD_RATE &&
  (ALLOW_NO_STATISTICS || product.statistics?.tvl) &&
  !product.mechanics.arguments?.enter?.fields?.some(
    (field) => field.required && field.name !== "amount"
  )

export const toYieldxyzEarnOpportunity = (
  product: YieldDto,
  tokenId: TokenId
): YieldxyzEarnOpportunity => ({
  id: `yieldxyz-${product.id}`,
  system: "yieldxyz",
  providerId: product.providerId,
  providerLogoURI: null,
  tokenId,
  networkId: tokenId.split(":")[0],
  title: product.metadata.name,
  type: product.mechanics.type,
  apr: product.rewardRate.total * 100,
  searchTerms: [
    product.metadata.name,
    product.providerId,
    product.mechanics.type,
    ...(product.tags ?? []),
  ],
  product,
})

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
    apr: yp.product.rewardRate.total * 100,
    rateType: yp.product.rewardRate.rateType,
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

const Metric: FC<
  PropsWithChildren<{ icon: ReactNode; tooltip: ReactNode; className?: string }>
> = ({ children, icon, tooltip, className }) => {
  const { t } = useTranslation()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("inline-flex shrink-0 items-center gap-2 self-start", className)}>
          <div className="shrink-0 align-text-bottom font-medium">{icon}</div>
          <div>{children ?? t("N/A")}</div>
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

const YieldxyzOpportunityTvl: FC<{ product: YieldDto }> = ({ product }) => {
  const { t } = useTranslation()
  return (
    <Metric
      icon={<LockIcon />}
      tooltip={t("Total value locked")}
      className="text-body-secondary text-xs"
    >
      {product.statistics &&
        Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          notation: "compact",
        }).format(Number(product.statistics?.tvlUsd ?? 0))}
    </Metric>
  )
}

const useOpportunities = () => {
  const products = useYieldxyzProducts()
  const { getYieldxyzTokenId } = useGetYieldxyzToken()

  const byTokenId = useMemo<Record<TokenId, EarnOpportunity[]>>(() => {
    const grouped =
      products.data
        ?.filter(isEnterableYieldProduct)
        .reduce<Record<TokenId, YieldxyzEarnOpportunity[]>>((acc, product) => {
          const inputTokenIds = product.inputTokens
            ?.map((inputToken) => getYieldxyzTokenId(inputToken))
            .filter(isNotNil) as TokenId[]

          const inputTokenId =
            inputTokenIds.length === 1
              ? inputTokenIds[0]
              : inputTokenIds.find((tokenId) =>
                  ["evm-native", "substrate-native", "sol-native"].includes(
                    parseTokenId(tokenId).type
                  )
                )

          if (!inputTokenId) return acc

          if (!acc[inputTokenId]) acc[inputTokenId] = []
          acc[inputTokenId].push(toYieldxyzEarnOpportunity(product, inputTokenId))

          return acc
        }, {}) || {}

    return Object.fromEntries(
      Object.entries(grouped).map(([tokenId, opps]) => [
        tokenId,
        opps.sort((a, b) => (b.apr ?? 0) - (a.apr ?? 0)),
      ])
    )
  }, [products.data, getYieldxyzTokenId])

  return useMemo(
    () => ({ status: asEarnSystemStatus(products.status), byTokenId }),
    [products.status, byTokenId]
  )
}

const useProviders = () => {
  const yieldProviders = useYieldxyzProviders()
  const providers = useMemo<EarnProvider[]>(
    () =>
      yieldProviders.data
        ?.filter((provider) => provider.type === "protocol")
        .map((provider) => ({
          id: provider.id,
          name: provider.name,
          type: "protocol",
          logoURI: provider.logoURI ?? null,
        })) ?? [],
    [yieldProviders.data]
  )
  return useMemo(
    () => ({ status: asEarnSystemStatus(yieldProviders.status), providers }),
    [yieldProviders.status, providers]
  )
}

const usePositions = () => {
  const { status, data } = useYieldxyzPositionsEnhanced()
  const { data: providers } = useYieldxyzProviders()
  const { getYieldxyzTokenId } = useGetYieldxyzToken()
  const tokensMap = useTokensMap()

  const providerByKey = useMemo(() => keyBy(providers ?? [], (p) => p.id), [providers])

  const positions = useMemo(() => {
    const mapped: EarnPosition[] = []
    for (const yp of data ?? []) {
      const position = mapYieldPosition(
        yp,
        getYieldxyzTokenId,
        tokensMap,
        providerByKey[yp.product.providerId]
      )
      if (position) mapped.push(position)
    }
    return mapped
  }, [data, getYieldxyzTokenId, tokensMap, providerByKey])

  return useMemo(() => ({ status: asEarnSystemStatus(status), positions }), [status, positions])
}

const useActionOpener = () => {
  const modal = useYieldxyzEnterModal()
  return useCallback<EarnActionOpener>(
    (opportunity, context) =>
      modal.open({
        pickerTokenId: context.tokenId,
        discoverOnly: context.discoverOnly,
        productId: (opportunity as YieldxyzEarnOpportunity).product.id,
      }),
    [modal]
  )
}

export const yieldxyzSystem: EarnSystem = {
  id: "yieldxyz",

  useOpportunities,

  useProviders,

  usePositions,

  useActionOpener,

  // yield.xyz opportunities render with the protocol logo, a TVL metric and the product yield widget
  renderOpportunityLogo: (opportunity) => (
    <YieldxyzProviderLogo providerId={opportunity.providerId} className="shrink-0 text-xl!" />
  ),
  renderOpportunityMetric: (opportunity) => (
    <YieldxyzOpportunityTvl product={(opportunity as YieldxyzEarnOpportunity).product} />
  ),
  renderOpportunityYield: (opportunity) => (
    <YieldxyzProductYieldDisplay product={(opportunity as YieldxyzEarnOpportunity).product} />
  ),
}
