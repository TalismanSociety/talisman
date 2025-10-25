import { useMemo } from "react"

import { useToken, useTokens } from "@ui/state"

import { useClaimWizard } from "../context/ClaimWizardContext"
import { mapYieldTokenToTokenId } from "../utils/tokenMapping"
import { useClaimFundsTransactionDot } from "./useClaimFundsTransactionDot"
import { useClaimFundsTransactionEth } from "./useClaimFundsTransactionEth"
import { useClaimFundsTransactionSol } from "./useClaimFundsTransactionSol"

export const useClaimFundsTransaction = () => {
  const { yieldId: _yieldId, balance } = useClaimWizard()
  const tokens = useTokens()

  // Get token ID from balance data using mapping function
  const tokenId = useMemo(() => {
    if (!balance?.token || !tokens) return ""
    return (
      mapYieldTokenToTokenId(
        balance.token.address || balance.token.symbol,
        balance.token.network,
        tokens,
      ) || ""
    )
  }, [balance?.token, tokens])

  const token = useToken(tokenId) // Get token from mapped token ID

  const txEth = useClaimFundsTransactionEth()
  const txDot = useClaimFundsTransactionDot()
  const txSol = useClaimFundsTransactionSol()

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
