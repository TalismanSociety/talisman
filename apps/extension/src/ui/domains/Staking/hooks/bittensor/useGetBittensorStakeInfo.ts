import { useQuery } from "@tanstack/react-query"

import { DelegatesData } from "./types"

const TAOSTATS_API_URL = "https://api-prod-v2.taostats.io/api"
const TAOSTATS_API_KEY = process.env.TAOSTATS_API_KEY || ""

const fetchBittensorStakeInfo = async (address?: string): Promise<DelegatesData> => {
  const response = await fetch(
    `${TAOSTATS_API_URL}/delegation/balance/latest/v1?nominator=${address}`,
    {
      method: "GET",
      headers: {
        "Authorization": TAOSTATS_API_KEY,
        "Content-Type": "application/json",
      },
    },
  ).then((res) => res.json())

  return response
}

export const useGetBittensorStakeInfo = ({
  address,
  isEnabled = true,
  totalStaked = 0n,
}: {
  address: string | undefined
  isEnabled?: boolean
  totalStaked?: bigint
}) => {
  const { data, ...rest } = useQuery({
    queryKey: ["useGetBittensorStakeInfo", address, totalStaked.toString()],
    queryFn: () => fetchBittensorStakeInfo(address),
    staleTime: 5 * 60 * 1000,
    enabled: !!address && isEnabled && totalStaked > 0n,
  })

  return { data: data?.data, ...rest }
}
