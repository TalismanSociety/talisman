// import { useMemo } from "react"

// import { useToken, useTokens } from "@ui/state"

// import { useWithdrawWizard } from "../context/WithdrawWizardContext"
// import { useWithdrawTransaction } from "../hooks/useWithdrawTransaction"
// import { mapYieldTokenToTokenId } from "../utils/tokenMapping"
// import { useWithdrawFundsTransactionDot } from "./useWithdrawFundsTransactionDot"
// import { useWithdrawFundsTransactionEth } from "./useWithdrawFundsTransactionEth"
// import { useWithdrawFundsTransactionSol } from "./useWithdrawFundsTransactionSol"

// // Type for transaction data
// type WithdrawTransactionData = ReturnType<typeof useWithdrawTransaction>

// // Withdraw transaction selector hook
// export const useWithdrawFundsTransaction = () => {
//   const { balance, tokenId } = useWithdrawWizard()
//   const tokens = useTokens()

//   // Get token ID from context first, fallback to balance mapping
//   const mappedTokenId = useMemo(() => {
//     if (tokenId) return tokenId
//     if (!balance?.token || !tokens) return ""
//     return (
//       mapYieldTokenToTokenId(
//         balance.token.address || balance.token.symbol,
//         balance.token.network,
//         tokens,
//       ) || ""
//     )
//   }, [tokenId, balance?.token, tokens])

//   const token = useToken(mappedTokenId)

//   // Call useWithdrawTransaction only once and pass the result to platform-specific hooks
//   const withdrawTransactionData: WithdrawTransactionData = useWithdrawTransaction()

//   const txEth = useWithdrawFundsTransactionEth(withdrawTransactionData)
//   const txDot = useWithdrawFundsTransactionDot(withdrawTransactionData)
//   const txSol = useWithdrawFundsTransactionSol(withdrawTransactionData)

//   return useMemo(() => {
//     switch (token?.platform) {
//       case "polkadot":
//         return txDot
//       case "ethereum":
//         return txEth
//       case "solana":
//         return txSol
//       default:
//         return null
//     }
//   }, [token?.platform, txDot, txEth, txSol])
// }
