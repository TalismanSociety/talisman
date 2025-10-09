import type { ValidatorDto } from "extension-core"
import { useQuery } from "@tanstack/react-query"

import { yieldApi } from "../services/yieldApi"

export const useYieldValidators = (yieldId: string | undefined) => {
  const {
    data: validators = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["yieldValidators", yieldId],
    queryFn: async (): Promise<ValidatorDto[]> => {
      if (!yieldId) {
        throw new Error("Yield ID is required")
      }

      const response = await yieldApi.getValidators(yieldId)
      return response.items ?? []
    },
    enabled: !!yieldId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  })

  return {
    validators,
    isLoading,
    error,
    refetch,
  }
}
