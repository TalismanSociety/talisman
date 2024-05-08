import { convertAddress } from "@talisman/util/convertAddress"
import { LedgerAccountDefSubstrateGeneric } from "@ui/domains/Account/AccountAdd/AccountAddLedger/context"
import { useLedgerSubstrateGeneric } from "@ui/hooks/ledger/useLedgerSubstrateGeneric"
import { AccountImportDef, useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
import useAccounts from "@ui/hooks/useAccounts"
import { SubstrateLedgerAppType } from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { DerivedAccountBase, DerivedAccountPickerBase } from "./DerivedAccountPickerBase"

const useLedgerSubstrateGenericAccounts = (
  selectedAccounts: LedgerAccountDefSubstrateGeneric[],
  pageIndex: number,
  itemsPerPage: number
) => {
  const walletAccounts = useAccounts()
  const { t } = useTranslation()

  const [ledgerAccounts, setLedgerAccounts] = useState<
    (LedgerSubstrateGenericAccount | undefined)[]
  >([...Array(itemsPerPage)])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string>()

  const { isReady, ledger, ...connectionStatus } = useLedgerSubstrateGeneric()

  const loadPage = useCallback(async () => {
    if (!ledger || !isReady) return

    setIsBusy(true)
    setError(undefined)

    const skip = pageIndex * itemsPerPage

    try {
      const newAccounts: (LedgerSubstrateGenericAccount | undefined)[] = [...Array(itemsPerPage)]

      for (let i = 0; i < itemsPerPage; i++) {
        const accountIndex = skip + i
        const addressOffset = 0

        const HARDENED = 0x80000000
        const account = HARDENED + accountIndex
        const change = HARDENED
        const addressIndex = HARDENED + addressOffset

        const { address } = await ledger.getAddress(account, change, addressIndex, 42)

        newAccounts[i] = {
          accountIndex,
          addressOffset,
          address,
          name: t("Ledger Polkadot {{accountIndex}}", { accountIndex: accountIndex + 1 }),
        } as LedgerSubstrateGenericAccount

        setLedgerAccounts([...newAccounts])
      }
    } catch (err) {
      log.error("Failed to load page", { err })
      setError((err as Error).message)
    }

    setIsBusy(false)
  }, [isReady, itemsPerPage, ledger, pageIndex, t])

  // start fetching balances only once all accounts are loaded to prevent recreating subscription 5 times
  const accountImportDefs = useMemo<AccountImportDef[]>(
    () =>
      ledgerAccounts.filter(Boolean).length === itemsPerPage
        ? ledgerAccounts
            .filter((acc): acc is LedgerSubstrateGenericAccount => !!acc)
            .map((acc) => ({ address: acc.address, type: "ecdsa", genesisHash: acc.genesisHash }))
        : [],
    [itemsPerPage, ledgerAccounts]
  )
  const balances = useAccountImportBalances(accountImportDefs)

  const accounts: (LedgerSubstrateGenericAccount | null)[] = useMemo(
    () =>
      ledgerAccounts.map((acc) => {
        if (!acc) return null

        const address = convertAddress(acc.address, null)
        const existingAccount = walletAccounts?.find(
          (wa) => convertAddress(wa.address, null) === address
        )

        const accountBalances = balances.find((b) => convertAddress(b.address, null) === address)

        return {
          ...acc,
          name: existingAccount?.name ?? acc.name,
          connected: !!existingAccount,
          selected: selectedAccounts.some((sa) => sa.address === acc.address),
          balances: accountBalances,
          isBalanceLoading:
            !balances.count || accountBalances.each.some((b) => b.status === "initializing"),
        }
      }),
    [ledgerAccounts, walletAccounts, balances, selectedAccounts]
  )

  useEffect(() => {
    // refresh on every page change
    loadPage()
  }, [loadPage])

  return {
    ledger,
    accounts,
    isBusy,
    error,
    connectionStatus,
  }
}

type LedgerSubstrateGenericAccountPickerProps = {
  onChange?: (accounts: LedgerAccountDefSubstrateGeneric[]) => void
}

type LedgerSubstrateGenericAccount = DerivedAccountBase & LedgerAccountDefSubstrateGeneric

export const LedgerSubstrateGenericAccountPicker: FC<LedgerSubstrateGenericAccountPickerProps> = ({
  onChange,
}) => {
  const { t } = useTranslation()
  const itemsPerPage = 5
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedAccounts, setSelectedAccounts] = useState<LedgerAccountDefSubstrateGeneric[]>([])
  const { accounts, error, isBusy } = useLedgerSubstrateGenericAccounts(
    selectedAccounts,
    pageIndex,
    itemsPerPage
  )

  const handleToggleAccount = useCallback((acc: DerivedAccountBase) => {
    const { address, name, accountIndex, addressOffset } = acc as LedgerSubstrateGenericAccount
    setSelectedAccounts((prev) =>
      prev.some((pa) => pa.address === address)
        ? prev.filter((pa) => pa.address !== address)
        : prev.concat({
            ledgerApp: SubstrateLedgerAppType.Generic,
            address,
            name,
            accountIndex,
            addressOffset,
          })
    )
  }, [])

  useEffect(() => {
    if (onChange) onChange(selectedAccounts)
  }, [onChange, selectedAccounts])

  const handlePageFirst = useCallback(() => setPageIndex(0), [])
  const handlePagePrev = useCallback(() => setPageIndex((prev) => prev - 1), [])
  const handlePageNext = useCallback(() => setPageIndex((prev) => prev + 1), [])

  return (
    <>
      <DerivedAccountPickerBase
        accounts={accounts}
        withBalances
        disablePaging={isBusy}
        canPageBack={pageIndex > 0}
        onAccountClick={handleToggleAccount}
        onPagerFirstClick={handlePageFirst}
        onPagerPrevClick={handlePagePrev}
        onPagerNextClick={handlePageNext}
      />
      <p className="text-alert-error">
        {error ? t("An error occured, Ledger might be locked.") : null}
      </p>
    </>
  )
}
