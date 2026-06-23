import type { DefiPosition } from "@core/domains/defi/exports"
import type { Token } from "@talismn/chaindata-provider"
import { useTokensMap } from "@ui/state/chaindata"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import { useCallback, useMemo } from "react"

import { SeekStakingModal } from "../seek/SeekStakingModal"
import {
  getSeekPositionValueUsd,
  SEEK_PROVIDER_ID,
  SEEK_PROVIDER_LOGO_URI,
  useSeekStakingConfig,
  useSeekStakingMetadata,
  useSeekStakingOpportunity,
  useSeekStakingPositions,
} from "../seek/useSeekStaking"
import { useSeekStakingModal } from "../seek/useSeekStakingModal"
import type { EarnOpportunity, EarnPosition, EarnProvider } from "../types"
import type { EarnActionOpener, EarnSystem, EarnSystemStatus } from "./types"

// SEEK is best-effort: only "loading" while a fetch is genuinely in flight with nothing cached to
// show (a disabled SEEK query stays react-query "pending" forever), and never "error" so a SEEK read
// failure can't break the whole Earn view.
const bestEffortStatus = (isFetching: boolean, hasData: boolean): EarnSystemStatus =>
  isFetching && !hasData ? "loading" : "success"

// A DeFi position is the same SEEK stake when it points at the staking contract, or (fallback) when
// its labels mention "seek" — the substring guard stops unrelated SEEK DeFi exposure on the same
// token from being hidden as a duplicate.
const isSeekDefiPosition = (position: DefiPosition, stakingContractAddress: string) => {
  if (position.poolAddress?.toLowerCase() === stakingContractAddress.toLowerCase()) return true

  return [position.id, position.name, position.defiId, position.defiName, position.symbol ?? ""]
    .join(" ")
    .toLowerCase()
    .includes("seek")
}

const useOpportunities = () => {
  const opportunity = useSeekStakingOpportunity()
  const byTokenId = useMemo<Record<string, EarnOpportunity[]>>(
    () => (opportunity.data ? { [opportunity.data.tokenId]: [opportunity.data] } : {}),
    [opportunity.data]
  )
  return useMemo(
    () => ({ status: bestEffortStatus(opportunity.isFetching, !!opportunity.data), byTokenId }),
    [opportunity.isFetching, opportunity.data, byTokenId]
  )
}

const useProviders = () => {
  const opportunity = useSeekStakingOpportunity()
  const providers = useMemo<EarnProvider[]>(
    () =>
      opportunity.data
        ? [{ id: "seek", name: "SEEK", type: "custom", logoURI: SEEK_PROVIDER_LOGO_URI }]
        : [],
    [opportunity.data]
  )
  return useMemo(
    () => ({ status: bestEffortStatus(opportunity.isFetching, !!opportunity.data), providers }),
    [opportunity.isFetching, opportunity.data, providers]
  )
}

const usePositions = () => {
  const config = useSeekStakingConfig()
  const { data: seekPositions, isLoading } = useSeekStakingPositions()
  const { data: metadata } = useSeekStakingMetadata({ enabled: !!seekPositions?.length })
  const tokensMap = useTokensMap()
  const tokenRatesMap = useTokenRatesMap()

  const rewardTokenId = metadata?.rewardTokenId ?? null
  const apr = metadata?.apr ?? null

  const positions = useMemo<EarnPosition[]>(() => {
    const stakeToken = (tokensMap[config.tokenId] as Token | undefined) ?? null
    const rewardToken = rewardTokenId
      ? ((tokensMap[rewardTokenId] as Token | undefined) ?? null)
      : stakeToken

    return (seekPositions ?? []).map((position) => ({
      id: `${SEEK_PROVIDER_ID}-${position.address}`,
      address: position.address,
      networkId: config.networkId,
      logoUrl: SEEK_PROVIDER_LOGO_URI,
      providerName: "SEEK",
      title: "SEEK Staking",
      type: "staking",
      isReadOnly: false,
      displayTokens: [
        {
          tokenId: config.tokenId,
          symbol: stakeToken?.symbol ?? "SEEK",
          logoUrl: stakeToken?.logo ?? null,
        },
      ],
      totalAmountUsd: getSeekPositionValueUsd(position, {
        stakeToken,
        rewardToken,
        stakeTokenUsd: tokenRatesMap[config.tokenId]?.usd?.price,
        rewardTokenUsd: rewardTokenId
          ? tokenRatesMap[rewardTokenId]?.usd?.price
          : tokenRatesMap[config.tokenId]?.usd?.price,
      }),
      apr,
      rateType: apr === null ? null : "APR",
      detailUrl: `/earn/positions/seek/${encodeURIComponent(position.address)}`,
      tokenIds: [config.tokenId],
      searchTerms: ["SEEK", "SEEK Staking", "staking"],
    }))
  }, [
    apr,
    config.networkId,
    config.tokenId,
    rewardTokenId,
    seekPositions,
    tokenRatesMap,
    tokensMap,
  ])

  const isDuplicateDefiPosition = useCallback(
    (defiPosition: DefiPosition) => isSeekDefiPosition(defiPosition, config.stakingContractAddress),
    [config.stakingContractAddress]
  )

  return useMemo(
    () => ({
      // gate on isLoading (first fetch, nothing to show yet), not isFetching: the 30s background
      // polls would otherwise flip this to "loading" and blank the aggregated positions list on
      // every poll for users with no active SEEK position
      status: bestEffortStatus(isLoading, !!seekPositions?.length),
      positions,
      isDuplicateDefiPosition,
    }),
    [isLoading, seekPositions, positions, isDuplicateDefiPosition]
  )
}

const useActionOpener = () => {
  const modal = useSeekStakingModal()
  return useCallback<EarnActionOpener>(() => modal.open({ action: "stake" }), [modal])
}

export const seekSystem: EarnSystem = {
  id: "seek",

  useOpportunities,

  useProviders,

  usePositions,

  useActionOpener,

  // mounted once per app shell via <EarnSystemActionModals />
  ActionModal: SeekStakingModal,
}
