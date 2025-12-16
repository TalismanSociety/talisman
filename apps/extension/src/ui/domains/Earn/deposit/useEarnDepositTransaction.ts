import { useMemo } from "react"

import { useToken } from "@ui/state"

import { useDepositWizard } from "../context/DepositWizardContext"
import { UseEarnDepositTransaction } from "./types"
import { useEarnDepositTransactionDot } from "./useEarnDepositTransactionDot"
import { useEarnDepositTransactionEth } from "./useEarnDepositTransactionEth"
import { useEarnDepositTransactionSol } from "./useEarnDepositTransactionSol"

export const useEarnDepositTransaction = (props: UseEarnDepositTransaction) => {
  const { tokenId } = useDepositWizard()
  const token = useToken(tokenId)

  // const {
  //   data: action,
  //   isLoading,
  //   error,
  // } = useYieldxyzEnterTransaction({
  //   address: props.address,
  //   yieldId: props.productId,
  //   amount: props.amount || 0n,
  //   validatorAddress: props.validatorAddress,
  // })

  const txEth = useEarnDepositTransactionEth(props)
  const txDot = useEarnDepositTransactionDot(props)
  const txSol = useEarnDepositTransactionSol(props)

  return useMemo(() => {
    switch (token?.platform) {
      case "polkadot":
        return txDot
      case "ethereum":
        return txEth
      case "solana":
        return txSol
      default:
        return null
    }
  }, [token?.platform, txDot, txEth, txSol])
}
