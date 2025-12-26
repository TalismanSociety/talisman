// import { FC } from "react"
// import { useTranslation } from "react-i18next"

// import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
// import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"

// import { AddressDisplay } from "../../SendFunds/AddressDisplay"
// import { ApyRow } from "./DepositAmountForm/ApyRow"
// import { ProtocolRow } from "./DepositAmountForm/ProtocolRow"
// import { useClaim } from "./useClaim"

// interface ClaimDetailsProps {
//   className?: string
// }

// export const ClaimDetails: FC<ClaimDetailsProps> = ({ className }) => {
//   const { t } = useTranslation()
//   const { account, token, product, claimAmount } = useClaim()

//   if (!account || !token || !product || !claimAmount) {
//     return (
//       <div className="flex h-full w-full items-center justify-center">
//         <div className="text-center text-gray-400">{t("Loading claim details...")}</div>
//       </div>
//     )
//   }

//   const getCuratorInfo = () => {
//     // This would need to be determined based on the product type
//     // For now, we'll show the provider or a default
//     return product?.providerId || t("Auto-selected")
//   }

//   const getReceiveInfo = (): string => {
//     return product?.outputToken?.symbol || ""
//   }

//   return (
//     <div className={`flex flex-col gap-6 ${className || ""}`}>
//       {/* Group 1: Amount and Account */}
//       <div className="flex flex-col gap-3">
//         {/* Amount */}
//         <div className="flex items-center justify-between">
//           <span className="text-body-secondary text-xs">{t("Amount")}</span>
//           <div className="flex w-full items-center justify-end gap-4 text-right">
//             <TokenLogo tokenId={token.id} className="text-sm" />
//             <TokensAndFiat
//               tokenId={token.id}
//               planck={claimAmount.planck}
//               tokensClassName="text-white text-xs"
//               noCountUp
//               noFiat
//             />
//           </div>
//         </div>

//         {/* Account */}
//         <div className="flex items-center justify-between">
//           <span className="text-body-secondary text-xs">{t("Account")}</span>
//           <AddressDisplay
//             address={account}
//             networkId={token.networkId}
//             className="text-xs"
//             hideBlockExplorer
//           />
//         </div>
//       </div>

//       {/* Divider */}
//       <div className="bg-grey-800 h-0.5 w-full"></div>

//       {/* Group 2: APY */}
//       <div className="flex flex-col gap-3">
//         {/* APY */}
//         <div className="!text-xs">
//           <ApyRow />
//         </div>
//       </div>

//       {/* Divider */}
//       <div className="bg-grey-800 h-0.5 w-full"></div>

//       {/* Group 3: Curator, Protocol, and Receive */}
//       <div className="flex flex-col gap-3">
//         {/* Curator */}
//         <div className="flex items-center justify-between">
//           <span className="text-body-secondary text-xs">{t("Curator")}</span>
//           <span className="text-body text-xs">{getCuratorInfo()}</span>
//         </div>

//         <div className="!text-xs">
//           <ProtocolRow />
//         </div>

//         {/* Receive - only show if outputToken exists */}
//         {product?.outputToken && (
//           <div className="flex items-center justify-between">
//             <span className="text-body-secondary text-xs">{t("Receive")}</span>
//             <span className="text-body text-xs">{getReceiveInfo()}</span>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }
