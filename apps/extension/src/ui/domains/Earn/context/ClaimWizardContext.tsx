// import { Address, BalanceDto } from "extension-core"
// import { useCallback, useMemo, useState } from "react"
// import { useNavigate, useSearchParams } from "react-router-dom"

// import { provideContext } from "@talisman/util/provideContext"

// type ClaimWizardParams = {
//   yieldId: string
//   account: Address
//   balance: BalanceDto // The balance with claim action
//   validatorAddress?: string
// }

// const STRING_PROPS = ["yieldId", "account", "validatorAddress"]

// export type ClaimWizardPage = "claim" | "confirm"

// const useClaimWizardProvider = () => {
//   const [searchParams, setSearchParams] = useSearchParams()
//   const navigate = useNavigate()

//   const {
//     yieldId,
//     account,
//     validatorAddress: _validatorAddress,
//   } = useMemo(
//     () => ({
//       yieldId: searchParams.get("yieldId") ?? undefined,
//       account: searchParams.get("account") ?? undefined,
//       validatorAddress: searchParams.get("validatorAddress") ?? undefined,
//     }),
//     [searchParams],
//   )

//   // Store balance in component state since it can't be serialized in URL
//   const [balance, setBalance] = useState<BalanceDto | null>(null)

//   const set = useCallback(
//     <T extends keyof ClaimWizardParams>(
//       key: T,
//       value: ClaimWizardParams[T],
//       goToNextPage = false,
//     ) => {
//       // Handle balance separately since it can't be serialized in URL
//       if (key === "balance") {
//         setBalance(value as BalanceDto)
//         return
//       }

//       // string values
//       if (STRING_PROPS.includes(key)) searchParams.set(key, value as string)
//       else throw new Error(`Invalid key ${key}`)

//       setSearchParams(searchParams, { replace: true })

//       if (goToNextPage) {
//         let page: ClaimWizardPage = "claim"
//         if (!searchParams.has("account")) page = "claim"
//         const url = `/select-product/claim/${page}?${searchParams.toString()}`
//         navigate(url)
//       }
//     },
//     [navigate, searchParams, setSearchParams],
//   )

//   const remove = useCallback(
//     (key: keyof ClaimWizardParams) => {
//       searchParams.delete(key)
//       setSearchParams(searchParams, { replace: true })
//     },
//     [searchParams, setSearchParams],
//   )

//   const goto = useCallback(
//     (page: ClaimWizardPage, replace?: boolean) => {
//       const url = `/select-product/claim/${page}?${searchParams.toString()}`
//       navigate(url, { replace })
//     },
//     [navigate, searchParams],
//   )

//   const gotoConfirm = useCallback(() => {
//     if (!account) throw new Error("Account is not set")
//     if (!yieldId) throw new Error("Yield ID is not set")

//     navigate(`/select-product/claim/confirm?${searchParams.toString()}`)
//   }, [account, navigate, searchParams, yieldId])

//   const gotoProgress = useCallback(
//     ({ networkId, txId }: { networkId: string; txId: string }) => {
//       const qs = new URLSearchParams()
//       qs.set("txId", txId)
//       qs.set("networkId", networkId)
//       navigate(`/select-product/claim/submitted?${qs.toString()}`)
//     },
//     [navigate],
//   )

//   const reset = useCallback(() => {
//     // Clear all search parameters to reset the wizard state
//     searchParams.delete("yieldId")
//     searchParams.delete("account")
//     searchParams.delete("validatorAddress")
//     setSearchParams(searchParams, { replace: true })
//   }, [searchParams, setSearchParams])

//   const resetUserInput = useCallback(() => {
//     // For claim, no user input to reset
//     // Keep all parameters as they are needed for execution
//   }, [])

//   return {
//     // State
//     yieldId,
//     account,
//     validatorAddress: _validatorAddress,
//     balance,
//     // Actions
//     set,
//     remove,
//     goto,
//     gotoConfirm,
//     gotoProgress,
//     reset,
//     resetUserInput,
//   }
// }

// export const [ClaimWizardProvider, useClaimWizard] = provideContext(useClaimWizardProvider)
