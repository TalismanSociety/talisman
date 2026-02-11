import { isTokenSubDTao, type NetworkId } from "@talismn/chaindata-provider"
import { useTokens } from "@ui/state"
import { assign, keyBy } from "lodash-es"
import { useEffect, useMemo, useRef } from "react"

import type { SubnetData } from "./types"
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
          })
        ),
    [allTokens, networkId]
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

  // Build maps only from fully-loaded data to prevent flickering.
  // During pagination, intermediate states would produce partial maps (missing entries),
  // causing consumers to see null fields. useStableMap keeps the previous map
  // until all pages are loaded or the new map has more entries.
  const rawDescriptionsMap = useMemo(
    () =>
      keyBy(
        subnetDescriptionsData?.pages
          .flatMap((page) => page.data)
          .map((desc) => ({ ...desc, descriptionName: desc.subnet_name })) ?? [],
        (desc) => desc.netuid
      ),
    [subnetDescriptionsData?.pages]
  )
  const descriptionsMap = useStableMap(
    rawDescriptionsMap,
    !isSubnetDescriptionsLoading &&
      !hasSubnetDescriptionsNextPage &&
      !isSubnetDescriptionsFetchingNextPage
  )

  const rawPoolsMap = useMemo(
    () =>
      keyBy(subnetPoolsData?.pages.flatMap((page) => page.data) ?? [], (pool) =>
        Number(pool.netuid)
      ),
    [subnetPoolsData?.pages]
  )
  const poolsMap = useStableMap(
    rawPoolsMap,
    !isSubnetPoolsLoading && !hasSubnetPoolsNextPage && !isSubnetPoolsFetchingNextPage
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
            subnetsMap[Number(tokenSubnet.netuid)] || {}
          )
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

/**
 * Use the latest map if it has grown or if all pages are done loading.
 * Prevents flickering when paginated queries transition from placeholder to real data,
 * which can temporarily produce maps with fewer entries.
 */
const useStableMap = <T>(map: Record<string, T>, allPagesDone: boolean): Record<string, T> => {
  const ref = useRef<Record<string, T>>({})
  if (allPagesDone || Object.keys(map).length > Object.keys(ref.current).length) {
    ref.current = map
  }
  return ref.current
}
