// import { ChevronLeftIcon } from "@talismn/icons"
// import { FC, ReactNode } from "react"
// import { IconButton } from "talisman-ui"

// import { BuyTokensOptionSwitch } from "./form/BuyTokensOptionSwitch"

// type BuyTokensLayoutProps = {
//   title?: ReactNode
//   withBuySellToggle?: boolean
//   onBackClick?: () => void
//   children?: ReactNode
// }

// export const BuyTokensLayout: FC<BuyTokensLayoutProps> = ({
//   title,
//   withBuySellToggle,
//   children,
//   onBackClick,
// }) => {
//   // const { close, route, setRoute } = useBuyTokensWizard()
//   // const handleClick = () => {
//   //   route === "mainForm" ? close() : setRoute("mainForm")
//   // }

//   return (
//     <div id="buy-tokens-modal" className="relative flex h-full w-full flex-col">
//       <div className="flex items-center justify-between px-10">
//         <div className="text-body-secondary flex h-32 min-h-[6.4rem] w-full items-center">
//           {onBackClick && (
//             <IconButton onClick={onBackClick}>
//               <ChevronLeftIcon />
//             </IconButton>
//           )}
//           <div className="flex items-center justify-between">
//             <div className="font-bold text-white">{title}</div>
//           </div>
//         </div>
//         <div className="flex items-center gap-2">
//           {withBuySellToggle && <BuyTokensOptionSwitch />}
//         </div>
//       </div>
//       <div className="w-full grow overflow-hidden">{children}</div>
//     </div>
//   )
// }
