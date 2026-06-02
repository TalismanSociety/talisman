import { DEBUG } from "@common/constants"
import type { DefiPosition } from "@core/domains/defi/exports"
import type { TokenDto, YieldxyzProvider } from "@core/domains/earn/exports"
import type { Network, NetworkId, Token, TokenId } from "@talismn/chaindata-provider"
import type { TokenRatesList } from "@talismn/token-rates"
import { isNotNil, type Loadable } from "@talismn/util"
import { useNetworksMapById, useTokensMap } from "@ui/state/chaindata"
import { useDefiPositions } from "@ui/state/defi"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import type { YieldxyzPositionEnhanced } from "@ui/state/yieldxyz"
import { useYieldxyzPositionsEnhanced, useYieldxyzProviders } from "@ui/state/yieldxyz"
import { keyBy } from "lodash-es"
import { useEffect, useMemo, useRef } from "react"

import { calcDefiItemValueUsd, resolveDefiTokenId } from "../defi/useDefiItemValueUsd"
import {
  getSeekPositionValueUsd,
  SEEK_PROVIDER_ID,
  SEEK_PROVIDER_LOGO_URI,
  useSeekStakingConfig,
  useSeekStakingMetadata,
  useSeekStakingPositions,
} from "../seek/useSeekStaking"
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
  apr: number | null // percentage value, e.g. 4.5 == 4.5%; null when unknown
  rateType: string | null // "APR" | "APY"; null when apr is null
  detailUrl: string
  tokenIds: TokenId[]
  searchTerms: string[]
}

const PRIMARY_DEFI_ITEM_TYPES = new Set(["deposit", "loan", "locked", "staked", "margin"])

const getPositionAddressNetworkKey = (position: Pick<EarnPosition, "address" | "networkId">) =>
  `${position.address.toLowerCase()}|${position.networkId}`

const isSeekDefiPosition = (position: DefiPosition, stakingContractAddress: string) => {
  if (position.poolAddress?.toLowerCase() === stakingContractAddress.toLowerCase()) return true

  return [position.id, position.name, position.defiId, position.defiName, position.symbol ?? ""]
    .join(" ")
    .toLowerCase()
    .includes("seek")
}

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
    apr: null,
    rateType: null,
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
  const { data: seekPositions, isFetching: seekIsFetching } = useSeekStakingPositions()
  const { data: providers } = useYieldxyzProviders()
  const seekConfig = useSeekStakingConfig()
  const { data: seekMetadata } = useSeekStakingMetadata({ enabled: !!seekPositions?.length })
  const { getYieldxyzTokenId } = useGetYieldxyzToken()
  const tokensMap = useTokensMap()
  const networksMap = useNetworksMapById()
  const tokenRatesMap = useTokenRatesMap()

  const seekRewardTokenId = seekMetadata?.rewardTokenId ?? null
  const seekApr = seekMetadata?.apr ?? null

  const providerByKey = useMemo(() => keyBy(providers ?? [], (p) => p.id), [providers])

  const { positions, excludedDefi } = useMemo(() => {
    const result: EarnPosition[] = []

    // Build yieldxyz positions first (these are actionable, preferred source)
    const yieldMapped: EarnPosition[] = []
    for (const yp of yieldPositions ?? []) {
      const mapped = mapYieldPosition(
        yp,
        getYieldxyzTokenId,
        tokensMap,
        providerByKey[yp.product.providerId]
      )
      if (mapped) yieldMapped.push(mapped)
    }

    const seekStakeToken = (tokensMap[seekConfig.tokenId] as Token | undefined) ?? null
    const seekRewardToken = seekRewardTokenId
      ? ((tokensMap[seekRewardTokenId] as Token | undefined) ?? null)
      : seekStakeToken
    const seekMapped: EarnPosition[] = (seekPositions ?? []).map((position) => {
      const token = seekStakeToken
      return {
        id: `${SEEK_PROVIDER_ID}-${position.address}`,
        address: position.address,
        networkId: seekConfig.networkId,
        logoUrl: SEEK_PROVIDER_LOGO_URI,
        providerName: "SEEK",
        title: "SEEK Staking",
        type: "staking",
        isReadOnly: false,
        displayTokens: [
          {
            tokenId: seekConfig.tokenId,
            symbol: token?.symbol ?? "SEEK",
            logoUrl: token?.logo ?? null,
          },
        ],
        totalAmountUsd: getSeekPositionValueUsd(position, {
          stakeToken: seekStakeToken,
          rewardToken: seekRewardToken,
          stakeTokenUsd: tokenRatesMap[seekConfig.tokenId]?.usd?.price,
          rewardTokenUsd: seekRewardTokenId
            ? tokenRatesMap[seekRewardTokenId]?.usd?.price
            : tokenRatesMap[seekConfig.tokenId]?.usd?.price,
        }),
        apr: seekApr,
        rateType: seekApr === null ? null : "APR",
        detailUrl: `/earn/positions/seek/${encodeURIComponent(position.address)}`,
        tokenIds: [seekConfig.tokenId],
        searchTerms: ["SEEK", "SEEK Staking", "staking"],
      }
    })

    // Build defi positions
    const defiMapped: { position: EarnPosition; source: DefiPosition }[] = []
    for (const dp of defiPositions ?? []) {
      const mapped = mapDefiPosition(dp, networksMap, tokensMap, tokenRatesMap)
      if (mapped) defiMapped.push({ position: mapped, source: dp })
    }

    // Exclude defi positions that duplicate an actionable provider position. YieldXYZ can be
    // matched by address/network/token overlap; SEEK needs a narrower check so unrelated SEEK DeFi
    // exposure does not disappear just because it shares the same token.
    const yieldTokensByAddressNetwork = new Map<string, Set<string>>()
    for (const yp of yieldMapped) {
      const key = getPositionAddressNetworkKey(yp)
      const existing = yieldTokensByAddressNetwork.get(key)
      if (existing) {
        for (const tid of yp.tokenIds) existing.add(tid)
      } else {
        yieldTokensByAddressNetwork.set(key, new Set(yp.tokenIds))
      }
    }

    const seekTokensByAddressNetwork = new Map<string, Set<string>>()
    for (const sp of seekMapped) {
      seekTokensByAddressNetwork.set(getPositionAddressNetworkKey(sp), new Set(sp.tokenIds))
    }

    const excluded: EarnPosition[] = []
    result.push(...yieldMapped, ...seekMapped)
    for (const { position: dp, source } of defiMapped) {
      const key = getPositionAddressNetworkKey(dp)
      const yieldTokenIds = yieldTokensByAddressNetwork.get(key)
      const seekTokenIds = seekTokensByAddressNetwork.get(key)
      const isYieldDuplicate =
        yieldTokenIds != null && dp.tokenIds.some((tid) => yieldTokenIds.has(tid))
      const isSeekDuplicate =
        isSeekDefiPosition(source, seekConfig.stakingContractAddress) &&
        seekTokenIds != null &&
        dp.tokenIds.some((tid) => seekTokenIds.has(tid))
      const isDuplicate = isYieldDuplicate || isSeekDuplicate
      if (isDuplicate) excluded.push(dp)
      else result.push(dp)
    }

    return { positions: result, excludedDefi: excluded }
  }, [
    yieldPositions,
    seekPositions,
    seekRewardTokenId,
    seekApr,
    defiPositions,
    providerByKey,
    seekConfig,
    getYieldxyzTokenId,
    tokensMap,
    networksMap,
    tokenRatesMap,
  ])

  // Log excluded duplicates once per mount in dev builds
  const hasLoggedRef = useRef(false)
  useEffect(() => {
    if (!DEBUG || hasLoggedRef.current || !excludedDefi.length) return
    hasLoggedRef.current = true
    // biome-ignore lint/suspicious/noConsole: development-only logging
    console.info(
      "[EarnPositions] Excluded %d defi positions that duplicate actionable earn positions:",
      excludedDefi.length,
      excludedDefi.map((p) => ({
        id: p.id,
        title: p.title,
        address: p.address,
        networkId: p.networkId,
        tokenIds: p.tokenIds,
      }))
    )
  }, [excludedDefi])

  // Show cached data immediately — only report "loading" when no positions are available.
  // SEEK is best-effort: count it as loading only while a fetch is genuinely in flight (a
  // disabled SEEK query sits at react-query status "pending"/fetchStatus "idle" forever), and
  // never let a SEEK read failure flip the whole positions list to "error".
  const isAnyLoading =
    yieldStatus === "loading" ||
    defiStatus === "loading" ||
    (seekIsFetching && !seekPositions?.length)
  const isAnyError = yieldStatus === "error" || defiStatus === "error"

  const status =
    positions.length > 0 ? "success" : isAnyLoading ? "loading" : isAnyError ? "error" : "success"

  return useMemo(
    () => ({ status, data: positions }) as Loadable<EarnPosition[]>,
    [status, positions]
  )
}
