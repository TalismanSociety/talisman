// import { classNames } from "@talismn/util"
// import { Suspense, useEffect } from "react"
// import { Modal } from "talisman-ui"

// import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
// import { IS_POPUP } from "@ui/util/constants"

// import { DepositAmountForm } from "./components/DepositAmountForm"
// import { DepositWizardProvider, useDepositWizard } from "./context/DepositWizardContext"

// interface DepositModalProps {
//   isOpen: boolean
//   onClose: () => void
//   onNext: () => void
//   account: string
//   tokenId: string
//   productId: string
//   validatorAddress?: string
// }

// const DepositModalContent = ({
//   onClose,
//   onNext,
//   account,
//   tokenId,
//   productId,
//   validatorAddress,
// }: Omit<DepositModalProps, "isOpen">) => {
//   const { set, resetUserInput, account: accountFromUrl } = useDepositWizard()

//   // Initialize the wizard with the provided parameters
//   // Only set account if it's not already in URL (to prevent URL update when account picker is used)
//   useEffect(() => {
//     if (tokenId && productId) {
//       // Only set account if it's not already in URL and we have an account prop
//       if (account && !accountFromUrl) {
//         set("account", account)
//       }
//       set("tokenId", tokenId)
//       set("productId", productId)
//       if (validatorAddress) {
//         set("validatorAddress", validatorAddress)
//       }
//     }
//   }, [account, accountFromUrl, tokenId, productId, validatorAddress, set])

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
//       id="deposit-modal-content"
//       className={classNames(
//         "relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
//         !IS_POPUP && "border-grey-800 rounded border",
//       )}
//     >
//       <div className="flex w-full items-center justify-center gap-8 overflow-hidden p-10">
//         <div className="text-base font-bold">Deposit</div>
//         <button
//           type="button"
//           onClick={handleClose}
//           className="text-body-secondary hover:text-body absolute right-10 text-xl"
//         >
//           ×
//         </button>
//       </div>

//       <div className="grow overflow-hidden pt-0">
//         <DepositAmountForm onNext={onNext} />
//       </div>
//     </div>
//   )
// }

// export const DepositModal = ({
//   isOpen,
//   onClose,
//   onNext,
//   account,
//   tokenId,
//   productId,
//   validatorAddress,
// }: DepositModalProps) => {
//   return (
//     <Modal containerId="main" isOpen={isOpen} onDismiss={onClose}>
//       <Suspense fallback={<SuspenseTracker name="DepositModal" />}>
//         <DepositWizardProvider>
//           <DepositModalContent
//             onClose={onClose}
//             onNext={onNext}
//             account={account}
//             tokenId={tokenId}
//             productId={productId}
//             validatorAddress={validatorAddress}
//           />
//         </DepositWizardProvider>
//       </Suspense>
//     </Modal>
//   )
// }
