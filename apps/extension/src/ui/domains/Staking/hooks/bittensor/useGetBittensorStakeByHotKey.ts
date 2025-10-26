// import { useMemo } from "react"

// import { useBalance, useBalances } from "@ui/state"

// import { BITTENSOR_TOKEN_ID } from "../../Bittensor/utils/constants"

// type GetBittensorStakeByHotKey = {
//   address: string | null | undefined
//   hotkey: string | number | undefined | null
//   isEnabled?: boolean
// }

// type Meta = { hotkey?: string } | undefined

// export const useGetBittensorStakeByHotKey = ({
//   address,
//   hotkey,
//   isEnabled,
// }: GetBittensorStakeByHotKey) => {
//   const balances = useBalances()
//   const balance = useBalance(isEnabled ? address : null, BITTENSOR_TOKEN_ID)

//   return useMemo(() => {
//     if (!balance || !hotkey) return undefined
//     const value = balance?.subtensor.find((b) => (b.meta as Meta)?.hotkey === hotkey)
//     return value?.amount.planck
//   }, [balance, hotkey])
// }
