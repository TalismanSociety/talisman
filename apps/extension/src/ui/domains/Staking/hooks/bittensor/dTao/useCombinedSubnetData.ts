import { isTokenSubDTao, type NetworkId } from "@talismn/chaindata-provider"
import { useGetSubnetPools } from "@ui/domains/Staking/hooks/bittensor/dTao/useGetSubnetPools"
import { useTokens } from "@ui/state"
import { assign, keyBy } from "lodash-es"
import { useMemo } from "react"

import { useTranslation } from "react-i18next"
import type { SubnetData } from "./types"
import { useGetSubnets } from "./useGetSubnets"

export type CombinedSubnetData = ReturnType<typeof useCombinedSubnetData>

export const useCombinedSubnetData = (networkId: NetworkId) => {
  const { t } = useTranslation()
  const allTokens = useTokens({ platform: "polkadot" })

  // these should load instantly
  const alphaTokenSubnets = useMemo(
    () =>
      allTokens
        .filter(isTokenSubDTao)
        // exclude dynamic ones, so we get only one for each netuid
        .filter((token) => !token.hotkey && token.networkId === networkId)
        .map(
          (s): SubnetData => ({
            netuid: s.netuid,
            name: s.subnetName || t("Subnet {{netuid}}", { netuid: s.netuid }),
            symbol: s.symbol,
          })
        ),
    [allTokens, networkId, t]
  )

  const {
    data: subnets,
    isLoading: isSubnetsLoading,
    isError: isSubnetsError,
    error: subnetsError,
  } = useGetSubnets()

  const {
    data: subnetPoolsData,
    isError: isSubnetPoolsError,
    isLoading: isSubnetPoolsLoading,
    error: subnetPoolsError,
  } = useGetSubnetPools()

  const poolsMap = useMemo(
    () => keyBy(subnetPoolsData ?? [], (pool) => Number(pool.netuid)),
    [subnetPoolsData]
  )

  const subnetsMap = useMemo(() => keyBy(subnets ?? [], (subnet) => subnet.netuid), [subnets])

  const subnetData = useMemo(() => {
    return alphaTokenSubnets
      .map(
        (tokenSubnet): SubnetData =>
          assign(
            {},
            tokenSubnet,
            poolsMap[Number(tokenSubnet.netuid)] || {},
            subnetsMap[Number(tokenSubnet.netuid)] || {}
          )
      )
      .sort((a, b) => (Number(a.netuid) || 0) - (Number(b.netuid) || 0))
  }, [alphaTokenSubnets, poolsMap, subnetsMap])

  return {
    subnetData,
    isError: isSubnetPoolsError || isSubnetsError,
    isLoading: isSubnetPoolsLoading || isSubnetsLoading,
    error: subnetPoolsError ?? subnetsError ?? null,
    isSubnetsLoading,
    isSubnetsError,
  }
}
