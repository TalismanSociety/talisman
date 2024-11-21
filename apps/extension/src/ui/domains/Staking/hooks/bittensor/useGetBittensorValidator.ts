import { useQueries, useQuery } from "@tanstack/react-query"
import { TAOSTATS_API_KEY, TAOSTATS_BASE_PATH } from "extension-shared"

const fetchBittensorValidator = async (
  hotkey: string | number | null | undefined,
): Promise<BittensorValidator> => {
  try {
    if (!TAOSTATS_API_KEY) {
      throw new Error("TAOSTATS_API_KEY is not set. Cannot make API request.")
    }

    if (!hotkey) {
      throw new Error("No hotkey provided")
    }

    return await (
      await fetch(`${TAOSTATS_BASE_PATH}/api/validator/latest/v1?hotkey=${hotkey}`, {
        method: "GET",
        headers: {
          "X-Extension-ID": TAOSTATS_API_KEY ?? "",
          "Content-Type": "application/json",
        },
      })
    ).json()
  } catch (cause) {
    throw new Error("Failed to fetch TAO stats", { cause })
  }
}

export const useGetBittensorValidator = (hotkey: string | number | null | undefined) => {
  return useQuery({
    queryKey: ["useGetBittensorValidator", hotkey],
    queryFn: () => fetchBittensorValidator(hotkey),
    enabled: !!hotkey,
    staleTime: 10 * 60 * 1000,
  })
}

export const useGetBittensorValidators = ({
  hotkeys,
  isEnabled = true,
}: {
  hotkeys: (string | undefined)[]
  isEnabled?: boolean
}) => {
  return useQueries({
    queries: hotkeys.map((hotkey) => ({
      queryKey: ["useGetBittensorValidator", hotkey],
      queryFn: () => fetchBittensorValidator(hotkey),
      enabled: !!hotkey && isEnabled,
      staleTime: 10 * 60 * 1000,
    })),
    combine: (results) => {
      return {
        data: results.map((result) => result.data?.data?.[0]).filter(Boolean),
        isPending: results.some((result) => result.isPending),
        isLoading: results.some((result) => result.isLoading),
        error: results.find((result) => result.isError),
      }
    },
  })
}

interface BittensorValidator {
  pagination: Pagination
  data: ValidatorData[]
}

interface Pagination {
  current_page: number
  per_page: number
  total_items: number
  total_pages: number
  next_page: number | null
  prev_page: number | null
}

interface ValidatorData {
  hotkey: KeyPair
  coldkey: KeyPair
  name: string
  block_number: number
  timestamp: string
  rank: number
  nominators: number
  nominators_24_hr_change: number
  system_stake: string
  stake: string
  stake_24_hr_change: string
  dominance: string
  validator_stake: string
  take: string
  total_daily_return: string
  validator_return: string
  nominator_return_per_k: string
  apr: string
  nominator_return_per_k_7_day_average: string
  nominator_return_per_k_30_day_average: string
  apr_7_day_average: string
  apr_30_day_average: string
  pending_emission: string
  blocks_until_next_reward: number
  last_reward_block: number
  registrations: number[]
  permits: number[]
  subnet_dominance: SubnetDominance[]
}

interface KeyPair {
  ss58: string
  hex: string
}

interface SubnetDominance {
  netuid: number
  dominance: string
  family_stake: string
}
