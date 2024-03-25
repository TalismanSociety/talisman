import { QueryKey, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { useBlockNumber } from "wagmi"

export const useInvalidateQueries = (queryKey: QueryKey | undefined) => {
  const queryClient = useQueryClient()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [blockNumber, queryClient, queryKey])
}
