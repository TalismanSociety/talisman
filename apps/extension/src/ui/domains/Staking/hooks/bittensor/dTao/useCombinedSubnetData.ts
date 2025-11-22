import { isTokenSubDTao, NetworkId } from "@talismn/chaindata-provider"
import { assign, keyBy } from "lodash-es"
import { useEffect, useMemo } from "react"

import { useTokens } from "@ui/state"

import { SubnetData } from "./types"
import { useGetInfiniteSubnetIdentities } from "./useGetInfiniteSubnetIdentities"
import { useGetInfiniteSubnetPools } from "./useGetInfiniteSubnetPools"
import { useGetSubnets } from "./useGetInfiniteSubnets"

export type CombinedSubnetData = ReturnType<typeof useCombinedSubnetData>

export const useCombinedSubnetData = (networkId: NetworkId) => {
  const allTokens = useTokens({ platform: "polkadot" })

  // these should load instantly
  const alphaTokenSubnets = useMemo(
    () =>
      allTokens
        .filter(isTokenSubDTao)
        // exclude dynamic ones, so we get only one for each netuid
        .filter((token) => !token.hotkey && token.networkId === networkId)
        .map(
          (t): SubnetData => ({
            netuid: t.netuid,
            name: t.subnetName,
            subnet_name: t.subnetName,
            symbol: t.symbol,
          }),
        ),
    [allTokens, networkId],
  )

  const { data: subnets, isLoading: isSubnetsLoading, isError: isSubnetsError } = useGetSubnets()
  const {
    data: subnetDescriptionsData,
    hasNextPage: hasSubnetDescriptionsNextPage,
    isFetchingNextPage: isSubnetDescriptionsFetchingNextPage,
    isError: isSubnetDescriptionsError,
    isLoading: isSubnetDescriptionsLoading,
    fetchNextPage: fetchSubnetDescriptionsNextPage,
  } = useGetInfiniteSubnetIdentities()

  const {
    data: subnetPoolsData,
    hasNextPage: hasSubnetPoolsNextPage,
    isFetchingNextPage: isSubnetPoolsFetchingNextPage,
    isError: isSubnetPoolsError,
    fetchNextPage: fetchSubnetPoolsNextPage,
    isLoading: isSubnetPoolsLoading,
  } = useGetInfiniteSubnetPools()

  useEffect(() => {
    if (hasSubnetDescriptionsNextPage && !isSubnetDescriptionsFetchingNextPage) {
      fetchSubnetDescriptionsNextPage()
    }
  }, [
    hasSubnetDescriptionsNextPage,
    isSubnetDescriptionsFetchingNextPage,
    fetchSubnetDescriptionsNextPage,
  ])

  useEffect(() => {
    if (hasSubnetPoolsNextPage && !isSubnetPoolsFetchingNextPage) {
      fetchSubnetPoolsNextPage()
    }
  }, [hasSubnetPoolsNextPage, isSubnetPoolsFetchingNextPage, fetchSubnetPoolsNextPage])

  const descriptionsMap = useMemo(
    () =>
      keyBy(
        subnetDescriptionsData?.pages
          .flatMap((page) => page.data)
          .map((desc) => ({ ...desc, descriptionName: desc.subnet_name })) ?? [],
        (desc) => desc.netuid,
      ),
    [subnetDescriptionsData?.pages],
  )

  const poolsMap = useMemo(
    () =>
      keyBy(subnetPoolsData?.pages.flatMap((page) => page.data) ?? [], (pool) =>
        Number(pool.netuid),
      ),
    [subnetPoolsData?.pages],
  )

  const subnetsMap = useMemo(() => keyBy(subnets ?? [], (subnet) => subnet.netuid), [subnets])

  const subnetData = useMemo(() => {
    return alphaTokenSubnets
      .map(
        (tokenSubnet): SubnetData =>
          assign(
            {},
            tokenSubnet,
            descriptionsMap[Number(tokenSubnet.netuid)] || {},
            poolsMap[Number(tokenSubnet.netuid)] || {},
            subnetsMap[Number(tokenSubnet.netuid)] || {},
          ),
      )
      .sort((a, b) => (Number(a.netuid) || 0) - (Number(b.netuid) || 0))
  }, [alphaTokenSubnets, descriptionsMap, poolsMap, subnetsMap])

  return {
    subnetData,
    isError: isSubnetDescriptionsError || isSubnetPoolsError,
    isLoading: isSubnetDescriptionsLoading || isSubnetPoolsLoading,
    isFetchingNextPage: isSubnetDescriptionsFetchingNextPage || isSubnetPoolsFetchingNextPage,
    isSubnetsLoading,
    isSubnetsError,
  }
}
