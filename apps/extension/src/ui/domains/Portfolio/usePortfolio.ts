// import { log } from "extension-shared"
// import { useAtom, useAtomValue, useSetAtom } from "jotai"
// import { useCallback, useEffect } from "react"

// // import {
// //   networkFilterAtom,
// //   portfolioAtom,
// //   portfolioGlobalDataAsyncAtom,
// //   portfolioGlobalDataAtom,
// //   portfolioSearchAtom,
// //   portfolioSelectedAccountsAtom,
// // } from "@ui/atoms"

// import { usePortfolioNavigation } from "./usePortfolioNavigation"
// import { NetworkOption, portfolioNetworkFilter$, portfolioSearch$, usePortfolioGlobalData } from "@ui/state"

// let isProvisioningHookMounted = false

// // call this only in the root component, this sadly can't be done from an atom
// export const usePortfolioProvisioning = () => {
//   //const globalData = useAtomValue(portfolioGlobalDataAsyncAtom)
//   const { selectedAccounts } = usePortfolioNavigation()

//   // // sync atom to maintain
//   // const { isProvisioned } = usePortfolioGlobalData()

//   // const setSearch = (search:string) => portfolioSea useSetAtom(portfolioSearchAtom)
//   // const setNetworkFilter = useSetAtom(networkFilterAtom)
//   // const setAccounts = useSetAtom(portfolioSelectedAccountsAtom)

//   // useEffect(() => {
//   //   // update sync atom
//   //   setGlobalData(globalData)
//   // }, [globalData, setGlobalData])

//   useEffect(() => {
//     // update sync atom
//     setAccounts(selectedAccounts)
//   }, [selectedAccounts, setAccounts])

//   useEffect(() => {
//     if (isProvisioningHookMounted) {
//       log.warn("Do not mount usePortfolioProvisioning more than once per page")
//     }
//     isProvisioningHookMounted = true
//     return () => {
//       isProvisioningHookMounted = false
//     }
//   }, [])

//   useEffect(() => {
//     // clear filter after unmount
//     return () => {
//       setNetworkFilter(undefined)
//       setSearch("")
//     }
//   }, [setNetworkFilter, setSearch])

//   return isProvisioned && isProvisioningHookMounted
// }

// // export const usePortfolio = () => {
// //   const setNetworkFilter = useCallback((network:NetworkOption | undefined) => {
// //     portfolioNetworkFilter$.next(network)
// //   }, [])
// //   const setSearch = useCallback((search:string) => {
// //     portfolioSearch$.next(search)
// //   }, [])

// //   const portfolio = useAtomValue(portfolioAtom)

// //   useEffect(() => {
// //     if (!isProvisioningHookMounted)
// //       log.error("usePortfolioProvisioning must be mounted before calling usePortfolio")
// //   }, [])

// //   return { ...portfolio, setNetworkFilter, setSearch }
// // }

// // export const usePortfolioSearch = () => {
// //   const [search, setSearch] = useAtom(portfolioSearchAtom)
// //   return { search, setSearch }
// // }
