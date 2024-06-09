// import { HexString } from "@polkadot/util/types"
// import { convertAddress } from "@talisman/util/convertAddress"
// import { appStateAtom } from "@ui/atoms"
// import {
//   LedgerAccountDefSubstrateGeneric,
//   LedgerAccountDefSubstrateMigration,
// } from "@ui/domains/Account/AccountAdd/AccountAddLedger/context"
// import { useLedgerSubstrateGeneric } from "@ui/hooks/ledger/useLedgerSubstrateGeneric"
// import { useLedgerSubstrateMigration } from "@ui/hooks/ledger/useLedgerSubstrateMigration"
// import {
//   SubstrateMigrationApp,
//   useLedgerSubstrateMigrationApp,
//   useLedgerSubstrateMigrationApps,
// } from "@ui/hooks/ledger/useLedgerSubstrateMigrationApps"
// import { AccountImportDef, useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
// import useAccounts from "@ui/hooks/useAccounts"
// import useChain from "@ui/hooks/useChain"
// import { ChainId, SubstrateLedgerAppType } from "extension-core"
// import { log } from "extension-shared"
// import { FC, useCallback, useEffect, useMemo, useState } from "react"
// import { useTranslation } from "react-i18next"

// import { DerivedAccountBase, DerivedAccountPickerBase } from "./DerivedAccountPickerBase"

// const useLedgerSubstrateMigrationAccounts = (
//   app: SubstrateMigrationApp | null,
//   selectedAccounts: LedgerAccountDefSubstrateMigration[],
//   pageIndex: number,
//   itemsPerPage: number
// ) => {
//   const walletAccounts = useAccounts()
//   const { t } = useTranslation()

//   const [ledgerAccounts, setLedgerAccounts] = useState<
//     (LedgerSubstrateMigrationAccount | undefined)[]
//   >([...Array(itemsPerPage)])
//   const [isBusy, setIsBusy] = useState(false)
//   const [error, setError] = useState<string>()

//   const { isReady, ledger, ...connectionStatus } = useLedgerSubstrateMigration(app?.name)

//   const loadPage = useCallback(async () => {
//     if (!ledger || !isReady || !app?.chain?.genesisHash) return

//     setIsBusy(true)
//     setError(undefined)

//     const skip = pageIndex * itemsPerPage

//     try {
//       const newAccounts: (LedgerSubstrateMigrationAccount | undefined)[] = [...Array(itemsPerPage)]

//       for (let i = 0; i < itemsPerPage; i++) {
//         const accountIndex = skip + i
//         const addressOffset = 0

//         const HARDENED = 0x80000000
//         const account = HARDENED + accountIndex
//         const change = HARDENED
//         const addressIndex = HARDENED + addressOffset

//         const { address } = await ledger.getAddress(account, change, addressIndex, app.prefix)

//         newAccounts[i] = {
//           accountIndex,
//           addressOffset,
//           address,
//           name: t("Ledger Polkadot {{accountIndex}}", { accountIndex: accountIndex + 1 }),
//           genesisHash: app.chain.genesisHash,
//         } as LedgerSubstrateMigrationAccount

//         setLedgerAccounts([...newAccounts])
//       }
//     } catch (err) {
//       log.error("Failed to load page", { err })
//       setError((err as Error).message)
//     }

//     setIsBusy(false)
//   }, [app, isReady, itemsPerPage, ledger, pageIndex, t])

//   // start fetching balances only once all accounts are loaded to prevent recreating subscription 5 times
//   const accountImportDefs = useMemo<AccountImportDef[]>(
//     () =>
//       ledgerAccounts.filter(Boolean).length === itemsPerPage
//         ? ledgerAccounts
//             .filter((acc): acc is LedgerSubstrateMigrationAccount => !!acc)
//             .map((acc) => ({ address: acc.address, type: "ecdsa", genesisHash: acc.genesisHash }))
//         : [],
//     [itemsPerPage, ledgerAccounts]
//   )
//   const balances = useAccountImportBalances(accountImportDefs)

//   const accounts: (LedgerSubstrateMigrationAccount | null)[] = useMemo(
//     () =>
//       ledgerAccounts.map((acc) => {
//         if (!acc) return null

//         const address = convertAddress(acc.address, null)
//         const existingAccount = walletAccounts?.find(
//           (wa) => convertAddress(wa.address, null) === address
//         )

//         const accountBalances = balances.balances.find(
//           (b) => convertAddress(b.address, null) === address
//         )

//         return {
//           ...acc,
//           name: existingAccount?.name ?? acc.name,
//           connected: !!existingAccount,
//           selected: selectedAccounts.some((sa) => sa.address === acc.address),
//           balances: accountBalances,
//           isBalanceLoading: balances.status === "initialising" || balances.status === "cached",
//         }
//       }),
//     [ledgerAccounts, walletAccounts, balances, selectedAccounts]
//   )

//   useEffect(() => {
//     // refresh on every page change
//     loadPage()
//   }, [loadPage])

//   return {
//     ledger,
//     accounts,
//     isBusy,
//     error,
//     connectionStatus,
//   }
// }

// type LedgerSubstrateMigrationAccountPickerProps = {
//   onChange?: (accounts: LedgerAccountDefSubstrateMigration[]) => void
//   chainId: ChainId
// }

// type LedgerSubstrateMigrationAccount = DerivedAccountBase & LedgerAccountDefSubstrateMigration

// export const LedgerSubstrateMigrationAccountPicker: FC<
//   LedgerSubstrateMigrationAccountPickerProps
// > = ({ onChange, chainId }) => {
//   const app = useLedgerSubstrateMigrationApp(chainId)
//   const { t } = useTranslation()
//   const itemsPerPage = 5
//   const [pageIndex, setPageIndex] = useState(0)
//   const [selectedAccounts, setSelectedAccounts] = useState<LedgerAccountDefSubstrateMigration[]>([])
//   const { accounts, error, isBusy } = useLedgerSubstrateMigrationAccounts(
//     app,
//     selectedAccounts,
//     pageIndex,
//     itemsPerPage
//   )

//   const handleToggleAccount = useCallback(
//     (acc: DerivedAccountBase) => {
//       const genesisHash = app?.chain?.genesisHash
//       if (!genesisHash) return

//       const { address, name, accountIndex, addressOffset } = acc as LedgerSubstrateMigrationAccount
//       setSelectedAccounts((prev) =>
//         prev.some((pa) => pa.address === address)
//           ? prev.filter((pa) => pa.address !== address)
//           : prev.concat({
//               ledgerApp: SubstrateLedgerAppType.Migration,
//               address,
//               name,
//               accountIndex,
//               addressOffset,
//               genesisHash,
//             })
//       )
//     },
//     [app?.chain]
//   )

//   useEffect(() => {
//     if (onChange) onChange(selectedAccounts)
//   }, [onChange, selectedAccounts])

//   const handlePageFirst = useCallback(() => setPageIndex(0), [])
//   const handlePagePrev = useCallback(() => setPageIndex((prev) => prev - 1), [])
//   const handlePageNext = useCallback(() => setPageIndex((prev) => prev + 1), [])

//   return (
//     <>
//       <DerivedAccountPickerBase
//         accounts={accounts}
//         withBalances
//         disablePaging={isBusy}
//         canPageBack={pageIndex > 0}
//         onAccountClick={handleToggleAccount}
//         onPagerFirstClick={handlePageFirst}
//         onPagerPrevClick={handlePagePrev}
//         onPagerNextClick={handlePageNext}
//       />
//       <p className="text-alert-error">
//         {error ? t("An error occured, Ledger might be locked.") : null}
//       </p>
//     </>
//   )
// }
