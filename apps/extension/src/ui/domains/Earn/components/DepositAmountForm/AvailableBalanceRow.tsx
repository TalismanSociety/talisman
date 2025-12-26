// import { classNames } from "@talismn/util"
// import { useTranslation } from "react-i18next"

// import { Fiat } from "@ui/domains/Asset/Fiat"
// import { Tokens } from "@ui/domains/Asset/Tokens"

// import { useDepositFunds } from "../useDepositFunds"
// import { Container } from "./Container"

// export const AvailableBalanceRow = () => {
//   const { t } = useTranslation()
//   const { balance, token } = useDepositFunds()

//   return (
//     <Container className="space-y-4 px-8 py-6">
//       <div className="flex w-full items-center justify-between">
//         <div className="text-grey-400 text-xs">{t("Available Balance")}</div>
//         {balance && token && (
//           <div
//             className={classNames(
//               "flex items-center gap-2",
//               balance?.status === "cache" && "animate-pulse",
//             )}
//           >
//             <Tokens
//               className="text-body"
//               amount={balance.transferable.tokens}
//               decimals={token?.decimals}
//               symbol={token?.symbol}
//               noCountUp
//               isBalance
//             />
//             <span className="text-body-secondary">
//               (<Fiat amount={balance.transferable} noCountUp isBalance />)
//             </span>
//           </div>
//         )}
//       </div>
//     </Container>
//   )
// }
