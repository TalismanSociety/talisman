// import { useMemo } from "react"

// import { useToken } from "@ui/state"

// import { useDepositWizard } from "../context/DepositWizardContext"
// import { useDepositFundsTransactionDot } from "./useDepositFundsTransactionDot"
// import { useDepositFundsTransactionEth } from "./useDepositFundsTransactionEth"
// import { useDepositFundsTransactionSol } from "./useDepositFundsTransactionSol"

// export const useDepositFundsTransaction = () => {
//   const { tokenId } = useDepositWizard()
//   const token = useToken(tokenId)

//   const txEth = useDepositFundsTransactionEth()
//   const txDot = useDepositFundsTransactionDot()
//   const txSol = useDepositFundsTransactionSol()

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
