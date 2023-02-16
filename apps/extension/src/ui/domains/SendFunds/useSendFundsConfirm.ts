// import { log } from "@core/log"
// import { HexString } from "@polkadot/util/types"
// import { provideContext } from "@talisman/util/provideContext"
// import { api } from "@ui/api"
// import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
// import useAccountByAddress from "@ui/hooks/useAccountByAddress"
// import { isEvmToken } from "@ui/util/isEvmToken"
// import { isSubToken } from "@ui/util/isSubToken"
// import { useCallback, useEffect, useMemo, useState } from "react"

// import { useSendFunds } from "./useSendFunds"

// type SignMethod = "normal" | "ledgerSubstrate" | "ledgerEthereum" | "unknown"

// // const useEvmTransaction = (
// //   tokenId?: string,
// //   from?: string,
// //   to?: string,
// //   amount?: string,
// //   isLocked?: boolean
// // ) => {
// //   const token = useToken(tokenId)

// //   const [tx, setTx] = useState<ethers.providers.TransactionRequest>()

// //   useEffect(() => {
// //     if (!isEvmToken(token) || !token.evmNetwork?.id || !from || !token || !amount || !to)
// //       setTx(undefined)
// //     else {
// //       getEthTransferTransactionBase(token.evmNetwork.id, from, to, token, amount)
// //         .then(setTx)
// //         .catch((err) => {
// //           setTx(undefined)
// //           // eslint-disable-next-line no-console
// //           console.error("EthTransactionFees", { err })
// //         })
// //     }
// //   }, [from, to, token, amount])

// //   const result = useEthTransaction(tx, isLocked)

// //   return tx ? { tx, ...result } : undefined
// // }

// // const useSubTransaction = (
// //   tokenId?: string,
// //   from?: string,
// //   to?: string,
// //   amount?: string,
// //   tip?: string,
// //   method?: AssetTransferMethod,
// //   isLocked?: boolean
// // ) => {
// //   const token = useToken(tokenId)

// //   const qSubstrateEstimateFee = useQuery({
// //     queryKey: ["estimateFee", from, to, token?.id, amount, tip, method],
// //     queryFn: async () => {
// //       if (!token?.chain?.id || !from || !to || !amount) return null
// //       const { partialFee, unsigned, pendingTransferId } = await api.assetTransferCheckFees(
// //         token.chain.id,
// //         token.id,
// //         from,
// //         to,
// //         amount,
// //         tip ?? "0",
// //         method
// //       )
// //       return { partialFee, unsigned, pendingTransferId }
// //     },
// //     refetchInterval: 10_000,
// //     enabled: !isLocked,
// //   })

// //   return useMemo(() => {
// //     if (!isSubToken(token)) return undefined

// //     const { partialFee, unsigned, pendingTransferId } = qSubstrateEstimateFee.data ?? {}
// //     const { isLoading, isRefetching, error } = qSubstrateEstimateFee

// //     return { partialFee, unsigned, pendingTransferId, isLoading, isRefetching, error }
// //   }, [qSubstrateEstimateFee, token])
// // }

// export const useSendFundsConfirmProvider = () => {
//   const { tokenId, amount, from, to, allowReap, sendMax, gotoProgress } = useSendFundsWizard()
//   //const token = useToken(tokenId)
//   const account = useAccountByAddress(from)

//   // lock sending payload to hardware device for signing
//   //const [isLocked, setIsLocked] = useState(false)

//   // TODO gasSettings
//   const { transfer, tip, method, evmTransaction, subTransaction, token, isLocked, setIsLocked } =
//     useSendFunds()
//   // from,
//   // to,
//   // tokenId,
//   // amount,
//   // allowReap,
//   // sendMax,
//   // isLocked

//   // const evmTransaction = useEvmTransaction(
//   //   tokenId,
//   //   from,
//   //   to,
//   //   sendAmount?.planck.toString(),
//   //   isLocked
//   // )
//   // const subTransaction = useSubTransaction(
//   //   tokenId,
//   //   from,
//   //   to,
//   //   sendAmount?.planck.toString(),
//   //   tip?.planck.toString(),
//   //   method,
//   //   isLocked
//   // )

//   const signMethod: SignMethod = useMemo(() => {
//     if (!account || !token) return "unknown"
//     if (account?.isHardware) {
//       if (isSubToken(token)) return "ledgerSubstrate"
//       else if (isEvmToken(token)) return "ledgerEthereum"
//       else throw new Error("Unknown token type")
//     }
//     return "normal"
//   }, [account, token])

//   // Button should enable 1 second after the form shows up, to prevent sending funds accidentaly by double clicking the review button on previous screen
//   const [isReady, setIsReady] = useState(false)
//   const [isProcessing, setIsProcessing] = useState(false)
//   const [errorMessage, setErrorMessage] = useState<string>()

//   useEffect(() => {
//     const timeout = setTimeout(() => {
//       setIsReady(true)
//     }, 1_000)

//     return () => {
//       clearTimeout(timeout)
//     }
//   }, [])

//   const send = useCallback(async () => {
//     try {
//       if (!from) throw new Error("Sender not found")
//       if (!to) throw new Error("Recipient not found")
//       if (!transfer && !sendMax) throw new Error("Amount not found")
//       if (!token) throw new Error("Token not found")

//       setIsProcessing(true)

//       if (token.chain?.id) {
//         const { id } = await api.assetTransfer(
//           token.chain.id,
//           token.id,
//           from,
//           to,
//           transfer?.planck.toString(),
//           tip?.planck.toString(),
//           method
//         )
//         gotoProgress({ substrateTxId: id })
//       } else if (token.evmNetwork?.id) {
//         if (!transfer) throw new Error("Missing send amount")
//         if (!evmTransaction?.gasSettings) throw new Error("Missing gas settings")
//         const { hash } = await api.assetTransferEth(
//           token.evmNetwork.id,
//           token.id,
//           from,
//           to,
//           transfer.planck.toString(),
//           evmTransaction.gasSettings
//         )
//         gotoProgress({ evmNetworkId: token.evmNetwork.id, evmTxHash: hash })
//       } else throw new Error("Unknown network")
//     } catch (err) {
//       log.error("Failed to submit tx", err)
//       setErrorMessage((err as Error).message)
//       setIsProcessing(false)
//     }
//   }, [
//     from,
//     to,
//     transfer,
//     sendMax,
//     token,
//     tip?.planck,
//     method,
//     gotoProgress,
//     evmTransaction?.gasSettings,
//   ])

//   const sendWithSignature = useCallback(
//     async (signature: HexString) => {
//       try {
//         setIsProcessing(true)
//         if (subTransaction?.pendingTransferId) {
//           // TODO get rid of pending transfer id
//           const transfer = await api.assetTransferApproveSign(
//             subTransaction.pendingTransferId,
//             signature
//           )
//           gotoProgress({ substrateTxId: transfer.id })
//           return
//         }
//         if (evmTransaction && amount && token?.evmNetwork?.id) {
//           const { hash } = await api.assetTransferEthHardware(
//             token?.evmNetwork.id,
//             token.id,
//             amount,
//             signature
//           )
//           gotoProgress({ evmNetworkId: token?.evmNetwork?.id, evmTxHash: hash })
//           return
//         }
//         throw new Error("Unknown transaction")
//       } catch (err) {
//         setErrorMessage((err as Error).message)
//         setIsProcessing(false)
//       }
//     },
//     [
//       amount,
//       evmTransaction,
//       gotoProgress,
//       subTransaction?.pendingTransferId,
//       token?.evmNetwork?.id,
//       token?.id,
//     ]
//   )

//   const ctx = useMemo(
//     () => ({
//       transfer,
//       evmTransaction,
//       subTransaction,
//       tip,
//       signMethod,
//       isReady,
//       errorMessage,
//       isProcessing,
//       send,
//       sendWithSignature,
//       isLocked,
//       setIsLocked,
//     }),
//     [
//       transfer,
//       evmTransaction,
//       subTransaction,
//       tip,
//       signMethod,
//       isReady,
//       errorMessage,
//       isProcessing,
//       send,
//       sendWithSignature,
//       isLocked,
//       setIsLocked,
//     ]
//   )

//   useEffect(() => {
//     log.log("useSendFundsConfirm", ctx)
//   })

//   return ctx
// }

// export const [SendFundsConfirmProvider, useSendFundsConfirm] = provideContext(
//   useSendFundsConfirmProvider
// )

export default {}
