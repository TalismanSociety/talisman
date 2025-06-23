import { ChainId } from "extension-core"
import { useMemo } from "react"

import { useBalance } from "@ui/state"

import { BITTENSOR_TOKEN_ID } from "../../Bittensor/utils/constants"

type GetBittensorStakeHotkeys = {
  chainId: ChainId | null | undefined
  address: string | null | undefined
}

type Meta = { hotkey?: string } | undefined

export const useGetBittensorStakeHotkeys = ({ chainId, address }: GetBittensorStakeHotkeys) => {
  const balance = useBalance(chainId === "bittensor" ? address : null, BITTENSOR_TOKEN_ID)

  return useMemo(() => {
    if (!balance) return undefined
    return balance.subtensor.map((b) => (b.meta as Meta)?.hotkey).filter((h): h is string => !!h)
  }, [balance])
}
