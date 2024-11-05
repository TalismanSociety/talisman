import { ChainId } from "extension-core"
import { FC } from "react"

import { useGetBittensorValidator } from "../hooks/bittensor/useGetBittensorValidator"
import { useNomPoolName } from "../hooks/nomPools/useNomPoolName"

export const NomPoolName: FC<{
  chainId: ChainId | null | undefined
  poolId: number | string | null | undefined
}> = ({ chainId, poolId }) => {
  let data,
    isLoading = false,
    poolName = "",
    defaultPoolName = "Talisman Pool"

  const hookMap = {
    nominationPool: useNomPoolName,
    bittensor: useGetBittensorValidator,
  }

  switch (chainId) {
    case "bittensor":
      ;({ data, isLoading } = hookMap["bittensor"](poolId as unknown as string))
      poolName = data?.data[0].name || ""
      defaultPoolName = "Bittensor Pool"
      break
    default:
      ;({ data, isLoading } = hookMap["nominationPool"](chainId, poolId as unknown as number))
      poolName = data || ""
      break
  }

  if (isLoading)
    return (
      <div className="text-grey-700 bg-grey-700 rounded-xs animate-pulse">{defaultPoolName}</div>
    )

  return <>{poolName}</>
}
