import { useInfiniteQuery } from "@tanstack/react-query"
import axios from "axios"
import { TAOSTATS_BASE_PATH } from "extension-shared"
import { useEffect, useMemo } from "react"

import { Subnet, SubnetsData } from "./types"

const fetchSubnets = async ({ pageParam = 1 }) => {
  const { data } = await axios.get<SubnetsData>(`${TAOSTATS_BASE_PATH}/api/subnet/latest/v1`, {
    params: { page: pageParam },
    method: "GET",
    headers: {
      "Authorization": TAOSTATS_BASE_PATH,
      "Content-Type": "application/json",
    },
  })
  return data
}

export const useGetInfiniteSubnets = () => {
  return useInfiniteQuery({
    queryKey: ["infiniteSubnets"],
    queryFn: fetchSubnets,
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
