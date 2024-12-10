import { useQuery } from "@tanstack/react-query"

import { ScaleApi } from "@ui/util/scaleApi"

type GetBittensorUnbondPayload = {
  sapi: ScaleApi | undefined | null
  isEnabled: boolean
  address: string | undefined
  hotkey: string | number | undefined
  plancks: bigint | null | undefined
}

export const useGetBittensorUnbondPayload = ({
  sapi,
  address,
  hotkey,
  isEnabled,
  plancks,
}: GetBittensorUnbondPayload) => {
  return useQuery({
    queryKey: ["SubtensorModule", "RemoveStake", sapi?.id, address],
    queryFn: async () => {
      if (!sapi || !address || !plancks) return null
      return sapi.getExtrinsicPayload(
        "SubtensorModule",
        "remove_stake",
        {
          hotkey: hotkey,
          amount_unstaked: plancks,
        },
        { address },
      )
    },
    enabled: !!sapi && !!address && !!plancks && isEnabled,
  })
}
