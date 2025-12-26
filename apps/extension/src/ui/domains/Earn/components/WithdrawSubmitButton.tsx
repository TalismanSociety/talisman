// import type { TransactionDto } from "extension-core"
// import { SignerPayloadJSON } from "@polkadot/types/types"
// import { deserializeTransactionFromHex, serializeTransaction } from "@talismn/solana"
// import {
//   isAccountPlatformEthereum,
//   isAccountPlatformPolkadot,
//   isAccountPlatformSolana,
//   serializeTransactionRequest,
// } from "extension-core"
// import { log } from "extension-shared"
// import { FC, useCallback, useMemo, useState } from "react"
// import { useTranslation } from "react-i18next"
// import { Button } from "talisman-ui"
// import { TransactionRequest } from "viem"

// import { api } from "@ui/api"
// import { useAccountByAddress } from "@ui/state"

// import { yieldApi } from "../services/yieldApi"
// import { useWithdrawFundsContext } from "./WithdrawFundsProvider"

// interface WithdrawSubmitButtonProps {
//   onSuccess?: (txHash: string) => void
//   onError?: (error: Error) => void
//   onTxSubmitted?: ({ networkId, txId }: { networkId: string; txId: string }) => void
// }

// export const WithdrawSubmitButton: FC<WithdrawSubmitButtonProps> = ({
//   onSuccess,
//   onError,
//   onTxSubmitted,
// }) => {
//   const { t } = useTranslation()
//   const { account, token, product, withdrawAmount, transaction } = useWithdrawFundsContext()
//   const accountData = useAccountByAddress(account as string)
//   const allTransactions = useMemo(
//     () => transaction?.allTransactions || [],
//     [transaction?.allTransactions],
//   )

//   // Get the adjusted transaction with proper gas limits (includes safety margins from useEthTransaction)
//   const adjustedTx = transaction?.platform === "ethereum" ? transaction.tx : undefined
//   const adjustedGasLimit = adjustedTx?.gas
//     ? typeof adjustedTx.gas === "bigint"
//       ? adjustedTx.gas
//       : BigInt(String(adjustedTx.gas))
//     : undefined

//   const [isSubmitting, setIsSubmitting] = useState(false)

//   const handleSubmit = useCallback(async () => {
//     if (!accountData || !token || !product || !withdrawAmount || allTransactions.length === 0) {
//       log.error("Missing required data for withdraw submission")
//       onError?.(new Error("Missing required data for transaction"))
//       return
//     }

//     if (allTransactions.length === 0) {
//       log.error("No transactions available from Yield.xyz")
//       onError?.(new Error("No transactions available from Yield.xyz"))
//       return
//     }

//     setIsSubmitting(true)

//     try {
//       let txHash: string | undefined

//       // Execute transactions sequentially
//       for (let i = 0; i < allTransactions.length; i++) {
//         const currentTransaction: TransactionDto = allTransactions[i]

//         // Skip if marked as skipped
//         if (currentTransaction.status === "SKIPPED") {
//           continue
//         }

//         if (isAccountPlatformEthereum(accountData)) {
//           // Parse and normalize Ethereum transaction (mirror deposit/claim logic)
//           const unsignedTxRaw =
//             typeof currentTransaction.unsignedTransaction === "string"
//               ? (JSON.parse(currentTransaction.unsignedTransaction) as Record<string, unknown>)
//               : (currentTransaction.unsignedTransaction as Record<string, unknown> | undefined)

//           if (!unsignedTxRaw || typeof unsignedTxRaw !== "object") {
//             throw new Error("Invalid Ethereum transaction format")
//           }

//           const unsignedTx = unsignedTxRaw as {
//             to?: string
//             value?: string
//             data?: string
//             from?: string
//             gas?: string
//             nonce?: number
//             maxFeePerGas?: string
//             maxPriorityFeePerGas?: string
//             gasPrice?: string
//           }

//           // Nonce handling for sequential txs
//           let currentNonce: number = typeof unsignedTx.nonce === "number" ? unsignedTx.nonce : 0
//           if (i > 0) {
//             try {
//               const nonceCount = await api.ethGetTransactionsCount(
//                 accountData.address as `0x${string}`,
//                 token.networkId,
//               )
//               currentNonce = nonceCount
//             } catch (error) {
//               const fallbackNonce = typeof unsignedTx.nonce === "number" ? unsignedTx.nonce : 0
//               currentNonce = fallbackNonce + i
//               log.warn("Failed to fetch current nonce, using fallback", {
//                 error,
//                 nonce: currentNonce,
//               })
//             }
//           }

//           if (!unsignedTx.to || !unsignedTx.data || !unsignedTx.from) {
//             throw new Error("Missing required Ethereum transaction fields")
//           }

//           // Always use gas settings from useEthTransaction (includes safety margins and user priority selection)
//           // We do NOT use gas estimation from Yield.xyz API at all
//           if (!adjustedTx || !adjustedGasLimit) {
//             throw new Error("Adjusted transaction with gas settings not available")
//           }

//           const baseTx: Omit<TransactionRequest, "type"> = {
//             to: unsignedTx.to as `0x${string}`,
//             value: BigInt(unsignedTx.value || "0"),
//             data: unsignedTx.data as `0x${string}`,
//             from: unsignedTx.from as `0x${string}`,
//             gas: adjustedGasLimit,
//             nonce: currentNonce,
//           }

//           // Use gas pricing from adjusted transaction (respects user priority selection)
//           let processedTx: TransactionRequest
//           if (
//             adjustedTx.type === "eip1559" &&
//             adjustedTx.maxFeePerGas &&
//             adjustedTx.maxPriorityFeePerGas
//           ) {
//             // EIP-1559 transaction
//             processedTx = {
//               ...baseTx,
//               type: "eip1559" as const,
//               maxFeePerGas:
//                 typeof adjustedTx.maxFeePerGas === "bigint"
//                   ? adjustedTx.maxFeePerGas
//                   : BigInt(String(adjustedTx.maxFeePerGas)),
//               maxPriorityFeePerGas:
//                 typeof adjustedTx.maxPriorityFeePerGas === "bigint"
//                   ? adjustedTx.maxPriorityFeePerGas
//                   : BigInt(String(adjustedTx.maxPriorityFeePerGas)),
//             } as TransactionRequest
//           } else if (adjustedTx.type === "legacy" && adjustedTx.gasPrice) {
//             // Legacy transaction
//             processedTx = {
//               ...baseTx,
//               type: "legacy" as const,
//               gasPrice:
//                 typeof adjustedTx.gasPrice === "bigint"
//                   ? adjustedTx.gasPrice
//                   : BigInt(String(adjustedTx.gasPrice)),
//             } as TransactionRequest
//           } else {
//             throw new Error("Adjusted transaction missing required gas pricing settings")
//           }

//           const serializedTx = serializeTransactionRequest(processedTx)
//           txHash = await api.ethSignAndSend(token.networkId, serializedTx)
//         } else if (isAccountPlatformPolkadot(accountData)) {
//           // Handle Polkadot transaction
//           const unsignedTxRaw =
//             typeof currentTransaction.unsignedTransaction === "string"
//               ? (JSON.parse(currentTransaction.unsignedTransaction) as Record<string, unknown>)
//               : (currentTransaction.unsignedTransaction as Record<string, unknown> | undefined)

//           if (!unsignedTxRaw || typeof unsignedTxRaw !== "object") {
//             throw new Error("Invalid Polkadot transaction format")
//           }

//           // Extract the actual transaction payload from the 'tx' property
//           const payload =
//             (unsignedTxRaw.tx as SignerPayloadJSON | undefined) ||
//             (unsignedTxRaw as unknown as SignerPayloadJSON)

//           // Validate payload has required SignerPayloadJSON fields
//           if (!payload.address || !payload.genesisHash || !payload.specVersion) {
//             throw new Error("Invalid SignerPayloadJSON: missing required fields")
//           }

//           const result = await api.subSubmit(payload)
//           txHash = result.hash
//         } else if (isAccountPlatformSolana(accountData)) {
//           // Handle Solana transaction
//           const unsignedTx: string =
//             typeof currentTransaction.unsignedTransaction === "string"
//               ? currentTransaction.unsignedTransaction
//               : JSON.stringify(currentTransaction.unsignedTransaction)

//           // Deserialize from hex and re-serialize
//           const deserializedTx = deserializeTransactionFromHex(unsignedTx)
//           if (!deserializedTx) {
//             throw new Error("Failed to deserialize Solana transaction from hex")
//           }
//           const serializedTx = serializeTransaction(deserializedTx)

//           const result = await api.solSubmit(token.networkId, serializedTx)
//           txHash = result.signature
//         }

//         // Submit hash to Yield.xyz API
//         if (txHash && currentTransaction.id) {
//           try {
//             await yieldApi.submitHash(currentTransaction.id, { hash: txHash })
//           } catch (error) {
//             log.error("Failed to submit hash to Yield.xyz", {
//               error,
//               transactionId: currentTransaction.id,
//             })
//             // Continue execution even if hash submission fails
//           }
//         }

//         // Call onTxSubmitted only for the last transaction, after it's submitted
//         const isLastTransaction = i === allTransactions.length - 1
//         if (isLastTransaction && onTxSubmitted && token) {
//           // Trigger progress screen after submitting the last transaction
//           onTxSubmitted({ networkId: token.networkId, txId: txHash || "" })
//         }
//       }

//       // Call onSuccess after all transactions are completed with last network tx hash
//       onSuccess?.(txHash || "")
//     } catch (error) {
//       log.error("Withdraw transaction failed", { error })
//       const errorMessage = error instanceof Error ? error : new Error(String(error))
//       onError?.(errorMessage)
//     } finally {
//       setIsSubmitting(false)
//     }
//   }, [
//     accountData,
//     token,
//     product,
//     withdrawAmount,
//     allTransactions,
//     adjustedTx,
//     adjustedGasLimit,
//     onTxSubmitted,
//     onSuccess,
//     onError,
//   ])

//   // For Ethereum transactions, ensure adjusted transaction with gas settings is ready
//   const isTransactionReady =
//     !isAccountPlatformEthereum(accountData) ||
//     (transaction?.platform === "ethereum" && adjustedTx && adjustedGasLimit)

//   const isDisabled =
//     isSubmitting ||
//     !account ||
//     !token ||
//     !product ||
//     !withdrawAmount ||
//     allTransactions.length === 0 ||
//     transaction?.isLoading ||
//     !isTransactionReady

//   return (
//     <Button
//       type="button"
//       primary
//       className="mt-8 w-full"
//       disabled={isDisabled}
//       onClick={handleSubmit}
//     >
//       {isSubmitting ? (
//         t("Processing...")
//       ) : (
//         <span className="inline-flex items-center gap-2">{t("Withdraw")}</span>
//       )}
//     </Button>
//   )
// }
