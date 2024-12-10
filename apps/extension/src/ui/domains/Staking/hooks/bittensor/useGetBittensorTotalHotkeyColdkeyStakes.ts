import { useQuery } from "@tanstack/react-query"

import { ScaleApi } from "@ui/util/scaleApi"

type GetBittensorTotalHotkeyColdkeyStakes = {
  sapi: ScaleApi | undefined | null
  address: string | null | undefined
  hotkey: string | number | undefined | null
  isEnabled: boolean
}

/**
 *  Returns a tuple (bigint: stakes, bigint: block_number) for a given coldkey and hotkey. block_number at which the user last staked/partially unstaked.
 * If the user unstaked the full amount, the block_number will be 0n and we have to track the last block number at which the user unstaked ourselves.
 */

export const useGetBittensorTotalHotkeyColdkeyStakes = ({
  sapi,
  address,
  hotkey,
  isEnabled,
}: GetBittensorTotalHotkeyColdkeyStakes) => {
  return useQuery({
    queryKey: ["useGetBittensorTotalHotkeyColdkeyStakes", sapi?.id, address, hotkey],
    queryFn: async () => {
      return sapi?.getStorage<[bigint, bigint]>(
        "SubtensorModule",
        "TotalHotkeyColdkeyStakesThisInterval",
        [address, hotkey],
      )
    },
    enabled: isEnabled && !!sapi && !!address && !!hotkey,
  })
}
