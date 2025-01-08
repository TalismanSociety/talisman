import { useQuery } from "@tanstack/react-query"

import { useRemoteConfig } from "@ui/state"

import { RampCurrency } from "../types"

const fetchRampCurrencies = async ({
  rampApiBasePath,
}: {
  rampApiBasePath: string
}): Promise<RampCurrency[]> => {
  try {
    return await (
      await fetch(`${rampApiBasePath}/currencies`, {
        method: "GET",
      })
    ).json()
  } catch (cause) {
    throw new Error("Failed to fetch Ramp currencies", { cause })
  }
}

export const useGetRampCurrencies = () => {
  const {
    rampConfig: { rampApiBasePath },
  } = useRemoteConfig()

  return useQuery({
    queryKey: ["useGetRampCurrencies"],
    queryFn: () => fetchRampCurrencies({ rampApiBasePath }),
    staleTime: 1000 * 60 * 5,
  })
}
