import { useQuery } from "@tanstack/react-query"
import { RAMPS_RAMP_API_URL } from "extension-shared"

import { RampCurrency } from "./types"

const fetchRampCurrencies = async (): Promise<RampCurrency[]> => {
  try {
    return await (await fetch(`${RAMPS_RAMP_API_URL}/api/host-api/v3/currencies`)).json()
  } catch (cause) {
    throw new Error("Failed to fetch Ramp currencies", { cause })
  }
}

export const useRampCurrencies = () => {
  return useQuery({
    queryKey: ["useRampCurrencies"],
    queryFn: () => fetchRampCurrencies(),
    staleTime: 1000 * 60 * 5,
  })
}
