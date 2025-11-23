import { useInfiniteQuery } from "@tanstack/react-query"
import { useEffect, useMemo } from "react"

import { fetchTaostats } from "./fetchTaostats"
import { ValidatorsYieldApiResponse } from "./types"

export function useGetInfiniteValidatorsYield({ netuid }: { netuid: number }) {
  return useInfiniteQuery({
    queryKey: ["infiniteValidatorsYield", netuid],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchTaostats<ValidatorsYieldApiResponse>({
        path: "/api/dtao/validator/yield/latest/v1",
        params: { page: pageParam, limit: 100, netuid },
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.pagination.next_page ?? undefined,
    getPreviousPageParam: (firstPage) => firstPage.pagination.prev_page ?? undefined,
    staleTime: 5 * 60 * 1000, // 5 mins
    gcTime: 10 * 60 * 1000, // 10 mins
    refetchOnReconnect: true,
  })
}

export function useGetInfiniteValidatorsYieldByNetuid({ netuid }: { netuid: number }) {
  const { data, hasNextPage, isFetchNextPageError, isError, fetchNextPage, isLoading } =
    useGetInfiniteValidatorsYield({ netuid })

  const combinedData = useMemo(() => data?.pages.flatMap((page) => page.data) || [], [data])

  useEffect(() => {
    if (hasNextPage && !isFetchNextPageError) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchNextPageError, fetchNextPage])

  return {
    data: combinedData,
    isError,
    isLoading,
  }
}
