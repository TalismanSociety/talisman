import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useBittensorSubnetNeurons } from "@ui/domains/Staking/Bittensor/hooks/useBittensorSubnetNeurons"
import { ROOT_NETUID } from "@ui/domains/Staking/Bittensor/utils/constants"
import { BITTENSOR_NETWORK_ID, useBittensorValidators } from "@ui/state/bittensor"
import { useRemoteConfig } from "@ui/state/remoteConfig"
import { keyBy } from "lodash-es"
import { useMemo } from "react"

import { useGetValidatorsYield } from "./dTao/useGetValidatorsYield"
import type { BondOption } from "./types"

/**
 * Validators to bond to, per network:
 * - mainnet: TaoData registry (names, APY, stakers) + remote-config featured ordering
 * - other networks: on-chain metagraph (TaoData and remote config only know mainnet) — no
 *   yield/stakers data, names from on-chain identities when set
 */
export const useCombinedBittensorValidatorsData = (
  networkId: DotNetworkId | null | undefined,
  netuid?: number | null
) => {
  const isMainnet = networkId === BITTENSOR_NETWORK_ID

  const { data: validatorsYieldData, isLoading: isLoadingYield } = useGetValidatorsYield({
    netuid: isMainnet ? netuid || 0 : null,
  })

  const { status, data: validators } = useBittensorValidators()

  const {
    neurons,
    isLoading: isLoadingNeurons,
    isError: isNeuronsError,
  } = useBittensorSubnetNeurons(isMainnet ? null : networkId, netuid)

  const {
    bittensor: { featuredValidators },
  } = useRemoteConfig()

  const featuredHotkeyOrder = useMemo(
    () => new Map(featuredValidators.map((hotkey, i) => [hotkey.toLowerCase(), i])),
    [featuredValidators]
  )

  const combinedValidatorsData = useMemo(() => {
    if (!isMainnet) {
      // root has no miners: every registered neuron is a delegate, and root validator permits are
      // only granted at epoch, so filtering on role hides them all on a freshly started chain
      return neurons
        .filter((neuron) => netuid === ROOT_NETUID || neuron.role !== "miner")
        .map(
          (neuron): BondOption => ({
            hotkey: neuron.hotkey,
            name: neuron.name ?? "",
            // subnet alpha stake in planck, only used for ordering - registry entries use global TAO stake
            totalStaked: Number(neuron.stakeOnSubnet),
            totalStakers: 0,
            validatorYield: undefined,
            apr: 0,
            subnets: 0,
            rank: 0,
            isFeatured: false,
            featuredOrder: -1,
            hasData: true,
            isError: isNeuronsError,
            source: "metagraph",
          })
        )
    }

    if (!validators || isLoadingYield) return []

    const validatorYieldMap = keyBy(validatorsYieldData ?? [], (yieldData) => yieldData.hotkey)

    const combined: BondOption[] =
      validators?.map((validator) => {
        const validatorYield = validatorYieldMap[validator.hotkey]

        return {
          hotkey: validator.hotkey,
          name: validator?.name ?? "",
          totalStaked: parseFloat(validator?.global_weighted_stake ?? "0"),
          totalStakers: validator?.global_nominators ?? 0,
          validatorYield,
          apr: Number(validatorYield?.thirty_day_apy ?? 0),
          subnets: validator.active_subnets,
          rank: validator.rank,
          isFeatured: featuredHotkeyOrder.has(validator.hotkey.toLowerCase()) && !!validatorYield,
          featuredOrder: featuredHotkeyOrder.get(validator.hotkey.toLowerCase()) ?? -1,
          hasData: !!validator,
          isError: status === "error",
          source: "registry" as const,
        }
      }) ?? []

    return combined
  }, [
    featuredHotkeyOrder,
    isLoadingYield,
    isMainnet,
    isNeuronsError,
    netuid,
    neurons,
    status,
    validators,
    validatorsYieldData,
  ])

  if (!isMainnet)
    return {
      combinedValidatorsData,
      isLoading: isLoadingNeurons,
      isInfiniteValidatorsError: isNeuronsError,
      isError: isNeuronsError,
    }

  return {
    combinedValidatorsData,
    isLoading: status === "loading" || isLoadingYield,
    isInfiniteValidatorsError: status === "error",
    isError: status === "error",
  }
}
