import { useMemo } from "react"

import { useBalance } from "@ui/state"

type GetBittensorStakeByHotKey = {
  address: string | null | undefined
  hotkey: string | number | undefined | null
  isEnabled?: boolean
}

type Meta = { hotkey?: string } | undefined

export const useGetBittensorStakeByHotKey = ({
  address,
  hotkey,
  isEnabled,
}: GetBittensorStakeByHotKey) => {
  const balance = useBalance(isEnabled ? address : null, "bittensor-substrate-native")

  return useMemo(() => {
    if (!balance || !hotkey) return undefined
    const value = balance?.subtensor.find((b) => (b.meta as Meta)?.hotkey === hotkey)
    return value?.amount.planck
  }, [balance, hotkey])
}
