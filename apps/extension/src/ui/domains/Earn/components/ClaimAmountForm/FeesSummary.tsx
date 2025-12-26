// import { InfoIcon, LoaderIcon } from "@talismn/icons"
// import { classNames } from "@talismn/util"
// import { useMemo } from "react"
// import { useTranslation } from "react-i18next"

// import { WithTooltip } from "@talisman/components/Tooltip"
// import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
// import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
// import { useBalance } from "@ui/state"

// import { useClaim } from "../useClaim"
// import { Container } from "./Container"
// import { TransactionPriorityRow } from "./TransactionPriorityRow"

// const ClaimFeeTooltip = () => {
//   const { t } = useTranslation()
//   const { feeToken, transaction, account } = useClaim()

//   // Get fee token balance - account is already a string
//   const feeTokenBalance = useBalance(account as string, feeToken?.id)

//   // Use transaction data based on platform (like SendFunds)
//   const estimatedFee = useMemo(() => {
//     if (!transaction) return undefined
//     // Handle different transaction types
//     if ("estimatedFee" in transaction && transaction.estimatedFee) {
//       return transaction.estimatedFee
//     }
//     if ("txDetails" in transaction && transaction.txDetails?.estimatedFee) {
//       return transaction.txDetails.estimatedFee
//     }
//     return undefined
//   }, [transaction])

//   const maxFee = useMemo(() => {
//     if (!transaction) return undefined
//     // Handle different transaction types
//     if ("maxFee" in transaction && transaction.maxFee) {
//       return transaction.maxFee
//     }
//     if (
//       "txDetails" in transaction &&
//       transaction.txDetails &&
//       "maxFee" in transaction.txDetails &&
//       transaction.txDetails.maxFee
//     ) {
//       return transaction.txDetails.maxFee
//     }
//     return undefined
//   }, [transaction])

//   if (!feeToken || !estimatedFee) return null

//   return (
//     <WithTooltip
//       className="ml-1"
//       tooltip={
//         <div className="grid grid-cols-2 gap-2">
//           <div>{t("Estimated fee:")}</div>
//           <div className="text-right">
//             <TokensAndFiat planck={estimatedFee} tokenId={feeToken.id} noCountUp />
//           </div>
//           {transaction?.platform === "ethereum" && !!maxFee && (
//             <>
//               <div>{t("Max. fee:")}</div>
//               <div className="text-right">
//                 <TokensAndFiat planck={maxFee} tokenId={feeToken.id} noCountUp />
//               </div>
//             </>
//           )}
//           {feeTokenBalance && (
//             <>
//               <div>{t("Balance:")}</div>
//               <div className="text-right">
//                 <TokensAndFiat
//                   planck={feeTokenBalance.transferable.planck}
//                   tokenId={feeToken.id}
//                   noCountUp
//                 />
//               </div>
//             </>
//           )}
//         </div>
//       }
//     >
//       <InfoIcon className="inline align-text-top text-sm" />
//     </WithTooltip>
//   )
// }

// const NetworkRow = () => {
//   const [t] = useTranslation()
//   const { network } = useClaim()

//   return (
//     <div className="flex w-full items-center justify-between">
//       <div className="text-grey-400 text-xs">{t("Network")}</div>
//       <div className="flex items-center gap-2">
//         <NetworkLogo networkId={network?.id} className="inline-block size-8" />
//         <div>{network?.name}</div>
//       </div>
//     </div>
//   )
// }

// export const FeesSummary = () => {
//   const { t } = useTranslation()
//   const { feeToken, estimatedFee, isLoading } = useClaim()

//   return (
//     <Container
//       className={classNames("space-y-4 px-8 py-6", isLoading && !estimatedFee && "animate-pulse")}
//     >
//       <NetworkRow />
//       <TransactionPriorityRow />
//       <div className="flex w-full items-center justify-between gap-4">
//         <div className="text-grey-400 whitespace-nowrap text-xs">
//           {t("Estimated Fee")} <ClaimFeeTooltip />
//         </div>
//         <div
//           className={classNames(
//             "flex grow items-center justify-end gap-2 truncate",
//             isLoading && estimatedFee && "animate-pulse",
//           )}
//         >
//           {isLoading && !estimatedFee && (
//             <div className="text-body-disabled flex items-center gap-2">
//               <span>{t("Validating Transaction")}</span>
//               <LoaderIcon className="animate-spin-slow" />
//             </div>
//           )}
//           {estimatedFee && feeToken && (
//             <TokensAndFiat planck={estimatedFee.planck} tokenId={feeToken.id} />
//           )}
//         </div>
//       </div>
//     </Container>
//   )
// }
