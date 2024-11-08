import { ChainId } from "extension-core"
import { FC } from "react"

import { BittensorBondDelegatorSelectDrawer } from "../Bittensor/BittensorBondDelegatorSelectDrawer"
import { useGetBittensorValidator } from "../hooks/bittensor/useGetBittensorValidator"
import { useNomPoolName } from "../hooks/nomPools/useNomPoolName"

export const BondPoolName: FC<{
  chainId: ChainId | null | undefined
  poolId: number | string | null | undefined
  setPoolId?: (poolId: number | string) => void
}> = ({ chainId, poolId, setPoolId }) => {
  let data,
    isLoading = false,
    poolName,
    defaultPoolName = "Talisman Pool"

  const hookMap = {
    nominationPool: useNomPoolName,
    bittensor: useGetBittensorValidator,
  }

  switch (chainId) {
    case "bittensor":
      ;({ data, isLoading } = hookMap["bittensor"](poolId as unknown as string))
      poolName = data?.data[0].name || ""
      poolName = (
        <BittensorBondDelegatorSelectDrawer
          poolName={poolName}
          poolId={poolId}
          setPoolId={setPoolId}
        />
      )
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
