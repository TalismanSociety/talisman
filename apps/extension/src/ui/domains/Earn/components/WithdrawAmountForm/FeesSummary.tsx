// import { InfoIcon, LoaderIcon } from "@talismn/icons"
// import { classNames } from "@talismn/util"
// import { useTranslation } from "react-i18next"

// import { WithTooltip } from "@talisman/components/Tooltip"
// import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
// import { useBalance } from "@ui/state"

// import { useWithdrawFundsContext } from "../WithdrawFundsProvider"
// import { Container } from "./Container"
// import { NetworkRow } from "./NetworkRow"
// import { TransactionPriorityRow } from "./TransactionPriorityRow"

// const WithdrawFeeTooltip = () => {
//   const { t } = useTranslation()
//   const { feeToken, estimatedFee, account } = useWithdrawFundsContext()

//   // Get fee token balance - use account address string
//   const feeTokenBalance = useBalance(account as string, feeToken?.id)

//   if (!feeToken || !estimatedFee) return null

//   return (
//     <WithTooltip
//       className="ml-1"
//       tooltip={
//         <div className="grid grid-cols-2 gap-2">
//           <div>{t("Estimated fee:")}</div>
//           <div className="text-right">
//             <TokensAndFiat planck={estimatedFee.planck} tokenId={feeToken.id} noCountUp />
//           </div>
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

// export const FeesSummary = () => {
//   const { t } = useTranslation()
//   const { feeToken, estimatedFee, isLoading } = useWithdrawFundsContext()

//   return (
//     <Container
//       className={classNames("space-y-4 px-8 py-6", isLoading && !estimatedFee && "animate-pulse")}
//     >
//       <NetworkRow />
//       <TransactionPriorityRow />
//       <div className="flex w-full items-center justify-between gap-4">
//         <div className="text-grey-400 whitespace-nowrap text-xs">
//           {t("Estimated Fee")} <WithdrawFeeTooltip />
//         </div>
//         <div
//           className={classNames(
//             "flex grow items-center justify-end gap-2",
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
//             <div className="max-w-[200px] truncate">
//               <TokensAndFiat
//                 planck={estimatedFee.planck}
//                 tokenId={feeToken.id}
//                 tokensClassName="text-xs"
//                 fiatClassName="text-xs"
//               />
//             </div>
//           )}
//         </div>
//       </div>
//     </Container>
//   )
// }
