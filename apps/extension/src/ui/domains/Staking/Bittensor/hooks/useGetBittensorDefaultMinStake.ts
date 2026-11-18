import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useMemo } from "react"

import { getDefaultMinStake } from "../utils/helpers"

type GetBittensorDefaultMinStake = {
  networkId: DotNetworkId | null | undefined
}

export const useGetBittensorDefaultMinStake = ({ networkId }: GetBittensorDefaultMinStake) => {
  const { data: sapi } = useScaleApi(networkId)

  return useMemo(() => getDefaultMinStake(sapi), [sapi])
}
