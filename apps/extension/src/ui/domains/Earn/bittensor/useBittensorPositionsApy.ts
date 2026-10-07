import { type UseQueryResult, useQueries } from "@tanstack/react-query"
import { getValidatorsYieldQueryOptions } from "@ui/domains/Staking/Bittensor/hooks/dTao/useGetValidatorsYield"
import { BITTENSOR_NETWORK_ID } from "@ui/state/bittensor"
import { uniq } from "lodash-es"
import { useMemo } from "react"

import type { BittensorStakePosition } from "./bittensorStakePosition"

type ValidatorsYield = Awaited<
  ReturnType<NonNullable<ReturnType<typeof getValidatorsYieldQueryOptions>["queryFn"]>>
>

const combineValidatorsYields = (results: UseQueryResult<ValidatorsYield>[]) =>
  results.map((result) => result.data)

const getApyKey = (netuid: number, hotkey: string) => `${netuid}:${hotkey}`

type Position = Pick<BittensorStakePosition, "networkId" | "netuid" | "hotkey">

/** APY percentage (5 == 5%) per position, from the same TaoData query as the bond wizard; mainnet only */
export const useBittensorPositionsApy = (positions: Position[]) => {
  const netuids = useMemo(
    () =>
      uniq(
        positions
          .filter((position) => position.networkId === BITTENSOR_NETWORK_ID)
          .map((position) => position.netuid)
      ).sort((a, b) => a - b),
    [positions]
  )

  const yields = useQueries({
    queries: netuids.map(getValidatorsYieldQueryOptions),
    combine: combineValidatorsYields,
  })

  return useMemo(() => {
    const apyByKey = new Map<string, number>()
    netuids.forEach((netuid, index) => {
      for (const validator of yields[index] ?? [])
        if (validator.thirty_day_apy !== null)
          apyByKey.set(getApyKey(netuid, validator.hotkey), validator.thirty_day_apy * 100)
    })

    return (position: Position): number | null =>
      position.networkId === BITTENSOR_NETWORK_ID
        ? (apyByKey.get(getApyKey(position.netuid, position.hotkey)) ?? null)
        : null
  }, [netuids, yields])
}
