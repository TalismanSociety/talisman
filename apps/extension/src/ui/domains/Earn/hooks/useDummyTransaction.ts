import { useMemo } from "react"

import { SendFundsTransactionProps } from "@ui/domains/SendFunds/types"
import { useSendFundsTransactionDot } from "@ui/domains/SendFunds/useSendFundsTransactionDot"
import { useSendFundsTransactionEth } from "@ui/domains/SendFunds/useSendFundsTransactionEth"
import { useSendFundsTransactionSol } from "@ui/domains/SendFunds/useSendFundsTransactionSol"
import { useToken } from "@ui/state"

type UseDummyTransactionProps = {
  address: string | undefined
  tokenId: string | undefined
}

export const useDummyTransaction = ({ address, tokenId }: UseDummyTransactionProps) => {
  const token = useToken(tokenId)

  const inputs = useMemo<SendFundsTransactionProps>(() => {
    return {
      tokenId,
      from: address,
      to: address,
      value: "0",
      sendMax: false,
      allowReap: false,
    }
  }, [address, tokenId])

  const txEth = useSendFundsTransactionEth(inputs)
  const txDot = useSendFundsTransactionDot(inputs)
  const txSol = useSendFundsTransactionSol(inputs)

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
