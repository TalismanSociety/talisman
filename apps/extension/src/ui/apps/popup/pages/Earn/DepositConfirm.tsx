// import { Suspense, useEffect } from "react"
// import { useNavigate, useSearchParams } from "react-router-dom"

// import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
// import { DepositDetails } from "@ui/domains/Earn/components/DepositDetails"
// import { DepositProgressBar } from "@ui/domains/Earn/components/DepositProgressBar"
// import { useDepositFunds } from "@ui/domains/Earn/components/useDepositFunds"
// import { YieldSubmitButton } from "@ui/domains/Earn/components/YieldSubmitButton"
// import {
//   DepositWizardProvider,
//   useDepositWizard,
// } from "@ui/domains/Earn/context/DepositWizardContext"

// const DepositConfirmContent = () => {
//   const [searchParams] = useSearchParams()
//   const navigate = useNavigate()
//   const { set, resetUserInput, gotoProgress } = useDepositWizard()
//   const { token } = useDepositFunds()

//   // Get parameters from URL
//   const account = searchParams.get("account") || ""
//   const tokenId = searchParams.get("tokenId") || ""
//   const productId = searchParams.get("productId") || ""

//   // Initialize the wizard with the provided parameters
//   useEffect(() => {
//     if (account && tokenId && productId) {
//       set("account", account)
//       set("tokenId", tokenId)
//       set("productId", productId)
//     }
//   }, [account, tokenId, productId, set])

//   const handleTransactionError = (_error: Error) => {
//     // Could show error state or go back to confirm
//     // For now, just log the error
//   }

//   const handleClose = () => {
//     resetUserInput()
//     // Navigate back to deposit amount page with preserved parameters
//     const params = new URLSearchParams()
//     if (account) params.set("account", account)
//     if (tokenId) params.set("tokenId", tokenId)
//     if (productId) params.set("productId", productId)
//     navigate(`/select-product/deposit/amount?${params.toString()}`, { replace: true })
//   }

//   return (
//     <div className="flex size-full flex-grow flex-col bg-black">
//       <div className="flex w-full items-center justify-center gap-8 overflow-hidden p-10">
//         <div className="text-base font-bold text-white">Staking</div>
//         <button
//           type="button"
//           onClick={handleClose}
//           className="text-body-secondary hover:text-body absolute right-10 text-xl"
//         >
//           ×
//         </button>
//       </div>

//       <div className="flex flex-col gap-16 px-10 pb-4">
//         <div className="text-body text-center text-lg font-bold">You're approving staking</div>
//         <div className="flex flex-col gap-32">
//           <DepositProgressBar currentStep={1} tokenSymbol={token?.symbol || "Token"} />
//           <DepositDetails />
//         </div>
//       </div>

//       <div className="grow overflow-hidden pt-0">
//         <div className="flex h-full w-full flex-col px-12 pb-8">
//           <div className="mt-auto">
//             <YieldSubmitButton
//               onError={handleTransactionError}
//               onTxSubmitted={({ networkId, txId }) => {
//                 gotoProgress({ networkId, txId })
//               }}
//             />
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

// export const DepositConfirm = () => {
//   return (
//     <Suspense fallback={<SuspenseTracker name="DepositConfirm" />}>
//       <DepositWizardProvider>
//         <DepositConfirmContent />
//       </DepositWizardProvider>
//     </Suspense>
//   )
// }
