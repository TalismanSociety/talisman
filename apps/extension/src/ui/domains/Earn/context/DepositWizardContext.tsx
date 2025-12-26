// import { TokenId } from "@talismn/chaindata-provider"
// import { Address } from "extension-core"
// import { useCallback, useMemo, useState } from "react"
// import { useNavigate, useSearchParams } from "react-router-dom"

// import { provideContext } from "@talisman/util/provideContext"

// type DepositWizardParams = {
//   account: Address
//   tokenId: TokenId
//   productId: string
//   amount: string // planck
//   depositMax: boolean
//   validatorAddress?: string
// }

// const STRING_PROPS = ["account", "tokenId", "productId", "amount", "validatorAddress"]
// const BOOL_PROPS = ["depositMax"]

// export type DepositWizardPage = "amount" | "confirm"

// const useDepositWizardProvider = () => {
//   const [searchParams, setSearchParams] = useSearchParams()
//   const navigate = useNavigate()
//   // Local state for account that doesn't update URL (to prevent sidebar from changing)
//   const [accountLocalState, setAccountLocalState] = useState<Address | undefined>(undefined)

//   const {
//     account: accountFromUrl,
//     tokenId,
//     productId,
//     amount,
//     depositMax,
//     validatorAddress: _validatorAddress,
//   } = useMemo(
//     () => ({
//       account: searchParams.get("account") ?? undefined,
//       tokenId: searchParams.get("tokenId") ?? undefined,
//       productId: searchParams.get("productId") ?? undefined,
//       amount: searchParams.get("amount") ?? undefined,
//       depositMax: searchParams.get("depositMax") !== null,
//       validatorAddress: searchParams.get("validatorAddress") ?? undefined,
//     }),
//     [searchParams],
//   )

//   // Account prefers local state over URL (to prevent sidebar from changing when account picker is used)
//   const account = useMemo(
//     () => accountLocalState ?? accountFromUrl,
//     [accountLocalState, accountFromUrl],
//   )

//   const set = useCallback(
//     <T extends keyof DepositWizardParams>(
//       key: T,
//       value: DepositWizardParams[T],
//       goToNextPage = false,
//     ) => {
//       // Special handling for account: store in local state instead of URL to prevent sidebar from changing
//       if (key === "account") {
//         setAccountLocalState(value as Address)
//         searchParams.delete("depositMax")
//         // Don't update URL for account
//         if (goToNextPage) {
//           const url = `/select-product/deposit/amount?${searchParams.toString()}`
//           navigate(url)
//         }
//         return
//       }

//       // reset amount if token changes, as decimals may be totally different
//       if (key === "tokenId" && value !== searchParams.get("tokenId")) {
//         searchParams.delete("amount")
//         searchParams.delete("depositMax")
//       }

//       if (key === "amount" && value) searchParams.delete("depositMax")

//       // boolean values
//       if (BOOL_PROPS.includes(key) && value) searchParams.set(key, "")
//       else if (BOOL_PROPS.includes(key) && !value) searchParams.delete(key)
//       // string values
//       else if (STRING_PROPS.includes(key)) searchParams.set(key, value as string)
//       else throw new Error(`Invalid key ${key}`)

//       setSearchParams(searchParams, { replace: true })

//       if (goToNextPage) {
//         let page: DepositWizardPage = "amount"
//         if (!account && !searchParams.has("account")) page = "amount"
//         else if (!searchParams.has("amount") && !searchParams.has("depositMax")) page = "amount"
//         const url = `/select-product/deposit/${page}?${searchParams.toString()}`
//         navigate(url)
//       }
//     },
//     [navigate, searchParams, setSearchParams, account],
//   )

//   const remove = useCallback(
//     (key: keyof DepositWizardParams) => {
//       if (key === "account") {
//         setAccountLocalState(undefined)
//       }
//       searchParams.delete(key)
//       setSearchParams(searchParams, { replace: true })
//     },
//     [searchParams, setSearchParams],
//   )

//   const goto = useCallback(
//     (page: DepositWizardPage, replace?: boolean) => {
//       const url = `/select-product/deposit/${page}?${searchParams.toString()}`
//       navigate(url, { replace })
//     },
//     [navigate, searchParams],
//   )

//   const gotoConfirm = useCallback(() => {
//     if (!account) throw new Error("Account is not set")
//     if (!tokenId) throw new Error("Token is not set")
//     if (!productId) throw new Error("Product is not set")
//     if (!amount && !depositMax) throw new Error("Amount is not set")

//     // Include account in URL for confirm page (it reads from URL)
//     const confirmParams = new URLSearchParams(searchParams)
//     if (account && !confirmParams.has("account")) {
//       confirmParams.set("account", account)
//     }
//     navigate(`/select-product/deposit/confirm?${confirmParams.toString()}`)
//   }, [account, navigate, searchParams, amount, depositMax, tokenId, productId])

//   const gotoProgress = useCallback(
//     ({ networkId, txId }: { networkId: string; txId: string }) => {
//       const qs = new URLSearchParams()
//       qs.set("txId", txId)
//       qs.set("networkId", networkId)
//       navigate(`/select-product/deposit/submitted?${qs.toString()}`)
//     },
//     [navigate],
//   )

//   const reset = useCallback(() => {
//     // Clear all search parameters to reset the wizard state
//     setAccountLocalState(undefined)
//     searchParams.delete("account")
//     searchParams.delete("tokenId")
//     searchParams.delete("productId")
//     searchParams.delete("amount")
//     searchParams.delete("depositMax")
//     setSearchParams(searchParams, { replace: true })
//   }, [searchParams, setSearchParams])

//   const resetUserInput = useCallback(() => {
//     // Clear only user input fields, keep account, tokenId, productId
//     searchParams.delete("amount")
//     searchParams.delete("depositMax")
//     setSearchParams(searchParams, { replace: true })
//   }, [searchParams, setSearchParams])

//   return {
//     // State
//     account,
//     tokenId,
//     productId,
//     amount,
//     depositMax,
//     validatorAddress: _validatorAddress,
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

// export const [DepositWizardProvider, useDepositWizard] = provideContext(useDepositWizardProvider)
