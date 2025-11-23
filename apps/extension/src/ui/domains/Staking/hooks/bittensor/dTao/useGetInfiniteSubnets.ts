import { useInfiniteQuery } from "@tanstack/react-query"
import { useEffect, useMemo } from "react"

import { fetchTaostats } from "./fetchTaostats"
import { Subnet, SubnetsData } from "./types"

export const useGetInfiniteSubnets = () => {
  return useInfiniteQuery({
    queryKey: ["infiniteSubnets"],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchTaostats<SubnetsData>({
        path: "/api/subnet/latest/v1",
        params: { page: pageParam },
        signal,
        includeAuthHeader: true,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.pagination.next_page ?? undefined,
    getPreviousPageParam: (firstPage) => firstPage.pagination.prev_page ?? undefined,
    staleTime: 5 * 60 * 1000, // 5 mins
    gcTime: 10 * 60 * 1000, // 10 mins
    refetchOnReconnect: true,
  })
}

export const useGetSubnets = () => {
  const {
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
    data: paginatedData,
    ...infiniteSubnetsIfo
  } = useGetInfiniteSubnets()

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const data = useMemo(
    () =>
      paginatedData?.pages.reduce<Subnet[]>((acc, page) => {
        acc.push(...page.data)
        return acc
      }, []),
    [paginatedData?.pages],
  )
  return { ...infiniteSubnetsIfo, data }
}
