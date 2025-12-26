// import { classNames } from "@talismn/util"
// import { BalanceDto } from "extension-core"
// import { Suspense, useEffect } from "react"
// import { Modal } from "talisman-ui"

// import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
// import { IS_POPUP } from "@ui/util/constants"

// import { ClaimAmountForm } from "./components/ClaimAmountForm"
// import { ClaimWizardProvider, useClaimWizard } from "./context/ClaimWizardContext"

// interface ClaimModalProps {
//   isOpen: boolean
//   onClose: () => void
//   onNext: () => void
//   yieldId: string
//   account: string
//   balance: BalanceDto
//   validatorAddress?: string
// }

// const ClaimModalContent = ({
//   onClose,
//   onNext,
//   yieldId,
//   account,
//   balance: _balance,
//   validatorAddress,
// }: Omit<ClaimModalProps, "isOpen">) => {
//   const { set, resetUserInput } = useClaimWizard()

//   // Initialize the wizard with the provided parameters
//   useEffect(() => {
//     if (account && yieldId) {
//       set("account", account)
//       set("yieldId", yieldId)
//       set("balance", _balance)
//       if (validatorAddress) {
//         set("validatorAddress", validatorAddress)
//       }
//     }
//   }, [account, yieldId, validatorAddress, _balance, set])

//   // In popup mode, don't render the modal - the pages will handle the full page view
//   if (IS_POPUP) {
//     return null
//   }

//   const handleClose = () => {
//     resetUserInput()
//     onClose()
//   }

//   return (
//     <div
//       id="claim-modal-content"
//       className={classNames(
//         "relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
//         !IS_POPUP && "border-grey-800 rounded border",
//       )}
//     >
//       <div className="flex w-full items-center justify-center gap-8 overflow-hidden p-10">
//         <div className="text-base font-bold">Claim Rewards</div>
//         <button
//           type="button"
//           onClick={handleClose}
//           className="text-body-secondary hover:text-body absolute right-10 text-xl"
//         >
//           ×
//         </button>
//       </div>

//       <div className="grow overflow-hidden pt-0">
//         <ClaimAmountForm onNext={onNext} />
//       </div>
//     </div>
//   )
// }

// export const ClaimModal = ({
//   isOpen,
//   onClose,
//   onNext,
//   yieldId,
//   account,
//   balance,
//   validatorAddress,
// }: ClaimModalProps) => {
//   return (
//     <Modal containerId="main" isOpen={isOpen} onDismiss={onClose}>
//       <Suspense fallback={<SuspenseTracker name="ClaimModal" />}>
//         <ClaimWizardProvider>
//           <ClaimModalContent
//             onClose={onClose}
//             onNext={onNext}
//             yieldId={yieldId}
//             account={account}
//             balance={balance}
//             validatorAddress={validatorAddress}
//           />
//         </ClaimWizardProvider>
//       </Suspense>
//     </Modal>
//   )
// }
