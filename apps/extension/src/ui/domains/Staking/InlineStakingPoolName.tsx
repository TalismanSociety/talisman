import { useInlineStakingWizard } from "./useInlineStakingWizard"
import { useNomPoolName } from "./useNomPoolName"

export const InlineStakingPoolName = () => {
  const { token, poolId } = useInlineStakingWizard()
  const { data: poolName, isLoading } = useNomPoolName(token?.chain?.id, poolId)

  if (isLoading)
    return <div className="text-grey-700 bg-grey-700 rounded-xs animate-pulse">Talisman Pool</div>

  return <>{poolName}</>
}
