// import type { ActionDto, TransactionDto } from "extension-core"
// import { planckToTokens } from "@talismn/util"
// import { useQuery } from "@tanstack/react-query"
// import { yieldSdk } from "extension-core"
// import { useEffect, useMemo, useRef, useState } from "react"
// import { TransactionRequest } from "viem"

// import { useBalance, useNetworkById, useToken } from "@ui/state"

// import { useWithdrawWizard } from "../context/WithdrawWizardContext"
// import { yieldApi } from "../services/yieldApi"

// export const useWithdrawTransaction = () => {
//   const {
//     account,
//     yieldId,
//     amount,
//     balance: _balance,
//     tokenId,
//     validatorAddress,
//   } = useWithdrawWizard()
//   const token = useToken(tokenId as string)
//   const _userBalance = useBalance(account as string, tokenId as string)
//   const _network = useNetworkById(token?.networkId)

//   // State for API response
//   const [yieldResponse, setYieldResponse] = useState<ActionDto | null>(null)
//   const [isLoading, setIsLoading] = useState(false)
//   const [error, setError] = useState<Error | null>(null)
//   const isApiCallInProgress = useRef(false)

//   // Fetch the selected product directly by ID to avoid filtering issues
//   const { data: _product } = useQuery({
//     queryKey: ["yieldProduct", yieldId],
//     queryFn: () => yieldSdk.getYield(yieldId!),
//     enabled: !!yieldId,
//     staleTime: 5 * 60 * 1000, // 5 minutes
//     retry: 2,
//   })

//   // Call exitYield API when we have all required parameters
//   useEffect(() => {
//     const callExitApi = async () => {
//       if (!account || !yieldId || !amount || isApiCallInProgress.current) {
//         return
//       }

//       isApiCallInProgress.current = true
//       setIsLoading(true)
//       setError(null)

//       try {
//         // Convert amount from planck units to decimal format for Yield.xyz API
//         const withdrawAmount = token ? planckToTokens(amount, token.decimals) : amount

//         const request = {
//           yieldId,
//           address: account,
//           arguments: {
//             amount: withdrawAmount,
//             ...(validatorAddress && validatorAddress !== "undefined" ? { validatorAddress } : {}),
//           },
//         }

//         const result = await yieldApi.exit(request)
//         setYieldResponse(result)
//       } catch (err) {
//         // Properly extract error message from various error formats
//         let errorMessage = "An error occurred"

//         if (err instanceof Error) {
//           errorMessage = err.message
//         } else if (typeof err === "string") {
//           errorMessage = err
//         } else if (err && typeof err === "object") {
//           // Try to extract message from error object
//           if ("message" in err) {
//             errorMessage = String(err.message)
//           } else if ("error" in err && typeof err.error === "string") {
//             errorMessage = err.error
//           } else if (
//             "error" in err &&
//             err.error &&
//             typeof err.error === "object" &&
//             "message" in err.error
//           ) {
//             errorMessage = String(err.error.message)
//           } else {
//             // Fallback: try to stringify if it's a simple object
//             try {
//               const stringified = JSON.stringify(err)
//               // Only use stringified version if it's not just "[object Object]"
//               if (stringified !== "{}" && !stringified.includes("[object")) {
//                 errorMessage = stringified
//               }
//             } catch {
//               // Keep default message
//             }
//           }
//         }

//         setError(new Error(errorMessage))
//       } finally {
//         setIsLoading(false)
//         isApiCallInProgress.current = false
//       }
//     }

//     callExitApi()
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [account, yieldId, amount, token?.decimals, validatorAddress])

//   // Get all non-skipped transactions for sequential execution
//   const allTransactions = useMemo((): TransactionDto[] => {
//     if (!yieldResponse?.transactions) return []

//     // Return all non-skipped transactions in order
//     return yieldResponse.transactions.filter((tx) => tx.status !== "SKIPPED")
//   }, [yieldResponse])

//   // Parse the first unsigned transaction for use with useEthTransaction (for gas estimation)
//   const parsedTransaction = useMemo((): TransactionRequest | undefined => {
//     const firstTransaction = allTransactions[0]
//     if (!firstTransaction?.unsignedTransaction) return undefined

//     try {
//       // Parse the unsigned transaction JSON string
//       const unsignedTx =
//         typeof firstTransaction?.unsignedTransaction === "string"
//           ? JSON.parse(firstTransaction?.unsignedTransaction)
//           : firstTransaction?.unsignedTransaction

//       // Validate required fields
//       if (!unsignedTx.to || !unsignedTx.data) {
//         return undefined
//       }

//       // Validate that to address is a valid Ethereum address
//       if (!unsignedTx.to.startsWith("0x") || unsignedTx.to.length !== 42) {
//         return undefined
//       }

//       // Validate that data is a valid hex string
//       if (!unsignedTx.data.startsWith("0x")) {
//         return undefined
//       }

//       // Convert to the format expected by useEthTransaction
//       const baseTx: TransactionRequest = {
//         to: unsignedTx.to as `0x${string}`,
//         value: BigInt(unsignedTx.value || "0"),
//         data: unsignedTx.data as `0x${string}`,
//         from: account as `0x${string}`,
//         gas: unsignedTx.gas ? BigInt(unsignedTx.gas) : undefined,
//         nonce: unsignedTx.nonce,
//       }

//       // Handle EIP-1559 vs legacy gas pricing
//       if (unsignedTx.maxFeePerGas && unsignedTx.maxPriorityFeePerGas) {
//         return {
//           ...baseTx,
//           type: "eip1559" as const,
//           maxFeePerGas: BigInt(unsignedTx.maxFeePerGas),
//           maxPriorityFeePerGas: BigInt(unsignedTx.maxPriorityFeePerGas),
//         } as TransactionRequest
//       } else if (unsignedTx.gasPrice) {
//         return {
//           ...baseTx,
//           type: "legacy" as const,
//           gasPrice: BigInt(unsignedTx.gasPrice),
//         } as TransactionRequest
//       }

//       return baseTx
//     } catch (error) {
//       return undefined
//     }
//   }, [allTransactions, account])

//   // Calculate max amount from Yield.xyz response if available
//   const maxAmount = useMemo(() => {
//     if (!yieldResponse?.amountRaw) return null
//     return yieldResponse.amountRaw
//   }, [yieldResponse])

//   return {
//     // Yield.xyz specific data
//     yieldResponse,
//     allTransactions: yieldResponse?.transactions || [],
//     nonSkippedTransactions: allTransactions, // New: filtered transactions for execution

//     // Transaction data for useEthTransaction
//     transaction: parsedTransaction,
//     maxAmount,

//     // Loading and error states
//     isLoading,
//     error,

//     // Helper flags
//     hasTransactions: !!yieldResponse?.transactions?.length,
//     isMultiStep: allTransactions.length > 1,
//     transactionCount: allTransactions.length,
//   }
// }
