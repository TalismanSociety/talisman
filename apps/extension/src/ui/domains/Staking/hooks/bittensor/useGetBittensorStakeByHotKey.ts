import { useQueries, useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

type GetBittensorStakeByHotKey = {
  address: string | null | undefined
  hotkey: string | number | undefined | null
  isEnabled?: boolean
}

type GetBittensorStakeByHotKeys = Omit<GetBittensorStakeByHotKey, "hotkey"> & {
  hotkeys: (string | undefined)[]
}
type GetBittensorStakesByHotKeys = Omit<GetBittensorStakeByHotKey, "address" | "hotkey"> & {
  addresses: (string | undefined)[]
  hotkeys: (string[] | undefined)[]
}

export const useGetBittensorStakeByHotKey = ({
  address,
  hotkey,
  isEnabled = true,
}: GetBittensorStakeByHotKey) => {
  const { data: sapi } = useScaleApi("bittensor")
  return useQuery({
    queryKey: ["useGetBittensorStakeByHotKey", sapi?.id, address, hotkey],
    queryFn: async () => {
      return sapi?.getStorage<bigint>("SubtensorModule", "Stake", [hotkey, address])
    },
    enabled: isEnabled && !!sapi && !!address && !!hotkey,
  })
}

export const useGetBittensorStakeByHotKeys = ({
  address,
  hotkeys,
  isEnabled = true,
}: GetBittensorStakeByHotKeys) => {
  const { data: sapi } = useScaleApi("bittensor")
  return useQueries({
    queries: hotkeys.map((hotkey) => ({
      queryKey: ["useGetBittensorStakeByHotKey", sapi?.id, address, hotkey],
      queryFn: () => sapi?.getStorage<bigint>("SubtensorModule", "Stake", [hotkey, address]),
      enabled: isEnabled && !!sapi && !!address && !!hotkey,
    })),
    combine: (results) => {
      return {
        data: results.map((result) => result.data),
        isPending: results.some((result) => result.isPending),
        isLoading: results.some((result) => result.isLoading),
        error: results.find((result) => result.isError),
      }
    },
  })
}

export const useGetBittensorStakesByHotKeys = ({
  addresses,
  hotkeys,
  isEnabled = true,
}: GetBittensorStakesByHotKeys) => {
  const { data: sapi } = useScaleApi("bittensor")
  return useQueries({
    queries: addresses
      .map((address, index) => {
        const hotkeysForAddress = hotkeys[index] ?? []
        return hotkeysForAddress.map((hotkey) => ({
          queryKey: ["useGetBittensorStakeByHotKey", sapi?.id, address, hotkey],
          queryFn: () => sapi?.getStorage<bigint>("SubtensorModule", "Stake", [hotkey, address]),
          enabled: isEnabled && !!sapi && !!address && !!hotkey,
        }))
      })
      .flat(),
    combine: (results) => {
      return {
        data: results.map((result) => result.data),
        isPending: results.some((result) => result.isPending),
        isLoading: results.some((result) => result.isLoading),
        error: results.find((result) => result.isError),
      }
    },
  })
}
