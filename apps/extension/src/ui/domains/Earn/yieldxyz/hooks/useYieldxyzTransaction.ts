import { useMemo } from "react"

import { useNetworkById } from "@ui/state"

import { UseYieldxyzTransactionProps } from "./types"
import { useYieldxyzTransactionDot } from "./useYieldxyzTransactionDot"
import { useYieldxyzTransactionEth } from "./useYieldxyzTransactionEth"
import { useYieldxyzTransactionSol } from "./useYieldxyzTransactionSol"

export const useYieldxyzTransaction = (props: UseYieldxyzTransactionProps | null) => {
  const network = useNetworkById(props?.networkId)

  const txEth = useYieldxyzTransactionEth(props)
  const txDot = useYieldxyzTransactionDot(props)
  const txSol = useYieldxyzTransactionSol(props)

  return useMemo(() => {
    switch (network?.platform) {
      case "polkadot":
        return txDot
      case "ethereum":
        return txEth
      case "solana":
        return txSol
      default:
        return null
    }
  }, [network?.platform, txDot, txEth, txSol])
}
