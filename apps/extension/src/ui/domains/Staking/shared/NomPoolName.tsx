import { ChainId } from "extension-core"
import { FC } from "react"

import { useNomPoolName } from "./useNomPoolName"

export const NomPoolName: FC<{
  chainId: ChainId | null | undefined
  poolId: number | null | undefined
}> = ({ chainId, poolId }) => {
  const { data: poolName, isLoading } = useNomPoolName(chainId, poolId)

  if (isLoading)
    return <div className="text-grey-700 bg-grey-700 rounded-xs animate-pulse">Talisman Pool</div>

  return <>{poolName}</>
}
