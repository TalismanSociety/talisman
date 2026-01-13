import type { DotNetworkId } from "@talismn/chaindata-provider"

import { useNomPoolName } from "../hooks/nomPools/useNomPoolName"

type NominationPoolNameProps = {
  poolId: string | number | undefined | null
  chainId: DotNetworkId | undefined
}

export const NominationPoolName = ({ chainId, poolId }: NominationPoolNameProps) => {
  const { data: poolName, isLoading, isError } = useNomPoolName(chainId, poolId)

  const defaultPoolName = "Talisman Pool"

  if (isLoading)
    return <div className={"h-[1.6rem] w-40 animate-pulse rounded-xs bg-grey-700 text-grey-700"} />

  if (isError || !poolName) return <>{defaultPoolName}</>

  return <>{poolName}</>
}
