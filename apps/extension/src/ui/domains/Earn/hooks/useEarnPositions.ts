import { DEBUG } from "@common/constants"
import type { DefiPosition } from "@core/domains/defi/exports"
import type { Network, NetworkId } from "@talismn/chaindata-provider"
import type { TokenRatesList } from "@talismn/token-rates"
import { isNotNil, type Loadable } from "@talismn/util"
import { useNetworksMapById, useTokensMap } from "@ui/state/chaindata"
import { useDefiPositions } from "@ui/state/defi"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import { useEffect, useMemo, useRef } from "react"

import { calcDefiItemValueUsd, resolveDefiTokenId } from "../defi/useDefiItemValueUsd"
import { useEarnSystemPositions } from "../systems/registry"
import type { EarnPosition, EarnPositionDisplayToken } from "../types"

export type { EarnPosition, EarnPositionDisplayToken } from "../types"

const PRIMARY_DEFI_ITEM_TYPES = new Set(["deposit", "loan", "locked", "staked", "margin"])

// stable empty reference returned while loading, so withholding partial data doesn't churn consumers
const EMPTY_POSITIONS: EarnPosition[] = []

const getPositionAddressNetworkKey = (position: Pick<EarnPosition, "address" | "networkId">) =>
  `${position.address.toLowerCase()}|${position.networkId}`

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
  const systemResults = useEarnSystemPositions()
  const { status: defiStatus, data: defiPositions } = useDefiPositions()
  const tokensMap = useTokensMap()
  const networksMap = useNetworksMapById()
  const tokenRatesMap = useTokenRatesMap()

  const { positions, excludedDefi } = useMemo(() => {
    const result: EarnPosition[] = []

    // actionable positions from every system (registry order); these are the preferred source
    const actionablePositions = systemResults.flatMap((systemResult) => systemResult.positions)
    result.push(...actionablePositions)

    // Build defi positions
    const defiMapped: { position: EarnPosition; source: DefiPosition }[] = []
    for (const dp of defiPositions ?? []) {
      const mapped = mapDefiPosition(dp, networksMap, tokensMap, tokenRatesMap)
      if (mapped) defiMapped.push({ position: mapped, source: dp })
    }

    // Exclude defi positions that duplicate an actionable system position. Each system contributes
    // an address|network -> tokenIds map (matched on token overlap) plus an optional narrowing gate
    // (e.g. SEEK only treats a defi position as a duplicate when its labels/pool match SEEK), so
    // unrelated defi exposure on the same token is not hidden.
    const systemDedup = systemResults.map((systemResult) => {
      const tokensByKey = new Map<string, Set<string>>()
      for (const position of systemResult.positions) {
        const key = getPositionAddressNetworkKey(position)
        const existing = tokensByKey.get(key)
        if (existing) for (const tokenId of position.tokenIds) existing.add(tokenId)
        else tokensByKey.set(key, new Set(position.tokenIds))
      }
      return { tokensByKey, isDuplicateDefiPosition: systemResult.isDuplicateDefiPosition }
    })

    const excluded: EarnPosition[] = []
    for (const { position: dp, source } of defiMapped) {
      const key = getPositionAddressNetworkKey(dp)
      const isDuplicate = systemDedup.some(({ tokensByKey, isDuplicateDefiPosition }) => {
        const tokenIds = tokensByKey.get(key)
        if (!tokenIds) return false
        if (!dp.tokenIds.some((tokenId) => tokenIds.has(tokenId))) return false
        return isDuplicateDefiPosition ? isDuplicateDefiPosition(source) : true
      })
      if (isDuplicate) excluded.push(dp)
      else result.push(dp)
    }

    return { positions: result, excludedDefi: excluded }
  }, [systemResults, defiPositions, networksMap, tokensMap, tokenRatesMap])

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

  // Gate on every source settling so positions paint all at once. Otherwise a faster source
  // (yieldxyz) renders first and a slower one (SEEK) pops in a tick later, causing flicker. Systems
  // bake their own best-effort semantics into status (SEEK never reports "error"), so a SEEK read
  // failure neither blocks the list nor flips it to "error".
  const systemStatuses = systemResults.map((systemResult) => systemResult.status)
  const isAnyLoading = defiStatus === "loading" || systemStatuses.some((s) => s === "loading")
  const isAnyError = defiStatus === "error" || systemStatuses.some((s) => s === "error")

  const status = isAnyLoading
    ? "loading"
    : positions.length > 0
      ? "success"
      : isAnyError
        ? "error"
        : "success"

  // While still loading, withhold partial results so consumers render the loading state rather than
  // a subset of positions that would otherwise grow (and flicker) as each source resolves.
  return useMemo(
    () =>
      ({ status, data: status === "loading" ? EMPTY_POSITIONS : positions }) as Loadable<
        EarnPosition[]
      >,
    [status, positions]
  )
}
