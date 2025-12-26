// import { createContext, ReactNode, useContext } from "react"

// import { useWithdrawFunds } from "./useWithdrawFunds"

// type WithdrawFundsData = ReturnType<typeof useWithdrawFunds>

// const WithdrawFundsContext = createContext<WithdrawFundsData | null>(null)

// export const WithdrawFundsProvider = ({ children }: { children: ReactNode }) => {
//   const withdrawFundsData = useWithdrawFunds()

//   return (
//     <WithdrawFundsContext.Provider value={withdrawFundsData}>
//       {children}
//     </WithdrawFundsContext.Provider>
//   )
// }

// export const useWithdrawFundsContext = () => {
//   const context = useContext(WithdrawFundsContext)
//   if (!context) {
//     throw new Error("useWithdrawFundsContext must be used within WithdrawFundsProvider")
//   }
//   return context
// }
