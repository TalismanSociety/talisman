import { ChainId } from "extension-core"

import { useNomPoolName } from "../hooks/nomPools/useNomPoolName"

type NominationPoolNameProps = {
  poolId: string | number | undefined | null
  chainId: ChainId | undefined
}

export const NominationPoolName = ({ chainId, poolId }: NominationPoolNameProps) => {
  const { data: poolName, isLoading, isError } = useNomPoolName(chainId, poolId)

  const defaultPoolName = "Talisman Pool"

  if (isLoading)
    return <div className={"text-grey-700 bg-grey-700 rounded-xs h-[1.6rem] w-40 animate-pulse"} />

  if (isError || !poolName) return <>{defaultPoolName}</>

  return <>{poolName}</>
}
