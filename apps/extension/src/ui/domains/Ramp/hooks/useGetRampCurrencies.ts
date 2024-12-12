import { useQuery } from "@tanstack/react-query"
import { RAMP_BASE_PATH } from "extension-shared"

import { RampCurrency } from "./types"

const fetchRampCurrencies = async (): Promise<RampCurrency[]> => {
  try {
    return await (
      await fetch(`${RAMP_BASE_PATH}/currencies`, {
        method: "GET",
      })
    ).json()
  } catch (cause) {
    throw new Error("Failed to fetch Ramp currencies", { cause })
  }
}

export const useGetRampCurrencies = () => {
  return useQuery({
    queryKey: ["useGetRampCurrencies"],
    queryFn: () => fetchRampCurrencies(),
    staleTime: 1000 * 60,
  })
}
