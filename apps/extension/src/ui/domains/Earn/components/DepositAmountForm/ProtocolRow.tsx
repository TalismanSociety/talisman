// import { useTranslation } from "react-i18next"
// import { PillButton } from "talisman-ui"

// import { useDepositFunds } from "../useDepositFunds"

// export const ProtocolRow = () => {
//   const { t } = useTranslation()
//   const { product } = useDepositFunds()

//   if (!product) return null

//   const { metadata } = product

//   return (
//     <div className="flex w-full items-center justify-between">
//       <div className="text-grey-400 text-xs">{t("Protocol")}</div>
//       <PillButton>
//         <div className="flex items-center gap-2 text-right">
//           <img
//             src={metadata.logoURI || undefined}
//             alt={metadata.name}
//             className="h-8 w-8 flex-shrink-0 rounded-full"
//             onError={(e) => {
//               e.currentTarget.style.display = "none"
//             }}
//           />
//           <div className="max-w-80 truncate text-white">{metadata.name}</div>
//         </div>
//       </PillButton>
//     </div>
//   )
// }
