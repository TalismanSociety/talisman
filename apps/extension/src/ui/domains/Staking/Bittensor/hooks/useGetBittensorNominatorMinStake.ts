import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { getNominatorMinStake } from "../utils/helpers"
import { useGetBittensorDefaultMinStake } from "./useGetBittensorDefaultMinStake"

type GetBittensorNominatorMinStake = {
  networkId: DotNetworkId | null | undefined
}

export const useGetBittensorNominatorMinStake = ({ networkId }: GetBittensorNominatorMinStake) => {
  const { data: sapi } = useScaleApi(networkId)
  const defaultMinStake = useGetBittensorDefaultMinStake({ networkId })

  return useQuery({
    queryKey: ["useGetBittensorNominatorMinStake", sapi?.id, defaultMinStake.toString()],
    queryFn: () => (sapi ? getNominatorMinStake(sapi) : null),
    enabled: !!sapi,
  })
}
