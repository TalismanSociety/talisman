// import { InfoIcon } from "@talismn/icons"
// import { useTranslation } from "react-i18next"

// import { useDepositFunds } from "../useDepositFunds"

// export const InsufficientTokenNotice = () => {
//   const { t } = useTranslation()
//   const { token, network, balance } = useDepositFunds()

//   if (!token || !network || !balance) return null

//   // Show notice when the user has no transferable balance of the input token
//   if (balance.transferable.planck > 0n) return null

//   return (
//     <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
//       <InfoIcon className="mt-0.5 h-4 w-4 text-blue-400" />
//       <div className="text-sm text-blue-200">
//         {t("You don't have {{symbol}} tokens on {{network}} network.", {
//           symbol: token.symbol,
//           network: network.name,
//         })}
//       </div>
//     </div>
//   )
// }
