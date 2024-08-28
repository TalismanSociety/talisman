// import { CheckCircleIcon, ChevronLeftIcon, XIcon } from "@talismn/icons"
// import { classNames } from "@talismn/util"
// import { BalanceFormatter } from "extension-core"
// import { useCallback, useState } from "react"
// import { useTranslation } from "react-i18next"
// import { IconButton, Modal } from "talisman-ui"

// import { ScrollContainer } from "@talisman/components/ScrollContainer"
// import { SearchInput } from "@talisman/components/SearchInput"

// import Tokens from "../Asset/Tokens"
// import { useInlineStakingModal } from "./useInlineStakingModal"
// import { useInlineStakingWizard } from "./useInlineStakingWizard"
// import { useNominationPools } from "./useNominationPools"

// export const InlineStakingPoolPicker = () => {
//   const { t } = useTranslation()
//   const { close } = useInlineStakingModal()
//   const { token, poolPicker, setPoolId, pool } = useInlineStakingWizard()
//   const [_search, setSearch] = useState("")

//   const pools = useNominationPools(token?.chain?.id)

//   const handleSelect = useCallback(
//     (poolId: number) => {
//       setPoolId(poolId)
//       poolPicker.close()
//     },
//     [poolPicker, setPoolId]
//   )

//   return (
//     <Modal
//       containerId="inlineStakingModalDialog"
//       isOpen={poolPicker.isOpen}
//       onDismiss={poolPicker.close}
//       className="relative z-50 size-full"
//     >
//       <div className="flex size-full flex-grow flex-col bg-black">
//         <header className="flex items-center justify-between p-10">
//           <IconButton onClick={poolPicker.close}>
//             <ChevronLeftIcon />
//           </IconButton>
//           <div>{"Select pool"}</div>
//           <IconButton onClick={close}>
//             <XIcon />
//           </IconButton>
//         </header>
//         <div className="flex w-full grow flex-col overflow-hidden">
//           <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
//             <SearchInput onChange={setSearch} placeholder={t("Search by name")} />
//           </div>
//           <ScrollContainer className=" bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
//             {pools.map((p) => (
//               <div
//                 key={p.id}
//                 className="hover:bg-grey-800 flex items-center justify-between gap-8 p-8 py-4"
//               >
//                 <div className="flex grow items-center justify-between gap-8">
//                   <div className="flex flex-col items-start gap-2">
//                     <div className="text-body text-sm">{p.name}</div>
//                     <div className=" text-body-secondary text-xs">
//                       <Tokens
//                         amount={new BalanceFormatter(p.balance, 10).tokens}
//                         decimals={10}
//                         symbol="DOT"
//                       />
//                     </div>
//                     <div className=" text-body-secondary text-xs">{p.members} members</div>
//                   </div>
//                   <div className="flex flex-col items-end gap-2">
//                     <div className=" text-green text-xs font-bold">
//                       {(p.apy * 100).toFixed(2)}% APY
//                     </div>
//                     <div className=" text-body-secondary text-xs">
//                       {(p.commission * 100).toFixed(2)}% Com.
//                     </div>
//                     {p.name.startsWith("Talisman") && (
//                       <div>
//                         <div
//                           className={classNames(
//                             "bg-primary/10 text-primary rounded-xs px-4 py-2 text-xs",
//                             p.name.startsWith("Talisman") ? "visible" : "invisible"
//                           )}
//                         >
//                           Auto-claim
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//                 <IconButton
//                   className={p.id === pool?.id ? "visible" : "invisible"}
//                   onClick={() => handleSelect(p.id)}
//                 >
//                   <CheckCircleIcon />
//                 </IconButton>
//               </div>
//             ))}
//           </ScrollContainer>
//         </div>
//       </div>
//     </Modal>
//   )
// }
