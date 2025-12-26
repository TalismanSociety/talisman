// import { TokenId } from "@talismn/chaindata-provider"
// import { Address } from "extension-core"
// import { useCallback } from "react"
// import { useNavigate } from "react-router-dom"

// import { IS_POPUP } from "@ui/util/constants"

// interface DepositNavigationParams {
//   account: Address
//   tokenId: TokenId
//   productId: string
//   validatorAddress?: string
// }

// /**
//  * Hook to handle navigation to deposit workflow with pre-selected product
//  * Works for both popup and dashboard modes
//  */
// export const useDepositNavigation = () => {
//   const navigate = useNavigate()

//   const navigateToDeposit = useCallback(
//     ({ account, tokenId, productId, validatorAddress }: DepositNavigationParams) => {
//       const params = new URLSearchParams({
//         account,
//         tokenId,
//         productId,
//       })

//       if (validatorAddress) {
//         params.set("validatorAddress", validatorAddress)
//       }

//       if (IS_POPUP) {
//         // Navigate to deposit amount page in popup mode
//         navigate(`/select-product/deposit/amount?${params.toString()}`)
//       } else {
//         // For dashboard mode, we would need to open a modal
//         // This would require state management for the modal
//         // For now, navigate to the same page but this should be updated
//         // to use the existing DepositModal pattern
//         navigate(`/select-product/deposit/amount?${params.toString()}`)
//       }
//     },
//     [navigate],
//   )

//   return {
//     navigateToDeposit,
//   }
// }
