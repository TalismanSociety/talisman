import { getEthLedgerDerivationPath } from "@extension/core"
import { LedgerEthDerivationPathType } from "@extension/core"
import { DEBUG } from "@extension/shared"
import { convertAddress } from "@talisman/util/convertAddress"
import { LedgerAccountDefEthereum } from "@ui/domains/Account/AccountAdd/AccountAddLedger/context"
import { useLedgerEthereum } from "@ui/hooks/ledger/useLedgerEthereum"
import { AccountImportDef, useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
import useAccounts from "@ui/hooks/useAccounts"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { DerivedAccountBase, DerivedAccountPickerBase } from "./DerivedAccountPickerBase"

const useLedgerEthereumAccounts = (
  name: string,
  derivationPathType: LedgerEthDerivationPathType,
  selectedAccounts: LedgerAccountDefEthereum[],
  pageIndex: number,
  itemsPerPage: number
) => {
  const { t } = useTranslation()
  const walletAccounts = useAccounts()
  const [derivedAccounts, setDerivedAccounts] = useState<(LedgerEthereumAccount | undefined)[]>([
    ...Array(itemsPerPage),
  ])
  const [isBusy, setIsBusy] = useState<boolean>()
  const [error, setError] = useState<string>()

  const { isReady, ledger, ...connectionStatus } = useLedgerEthereum()

  const loadPage = useCallback(async () => {
    if (!ledger || !isReady) return

    setError(undefined)
    setIsBusy(true)
    const skip = pageIndex * itemsPerPage

    try {
      const newAccounts: (LedgerEthereumAccount | undefined)[] = [...Array(itemsPerPage)]

      for (let i = 0; i < itemsPerPage; i++) {
        const accountIndex = skip + i
        const path = getEthLedgerDerivationPath(derivationPathType, accountIndex)

        const { address } = await ledger.getAddress(path)

        newAccounts[i] = {
          accountIndex,
          name: `${name.trim()} ${accountIndex + 1}`,
          path,
          address,
        } as LedgerEthereumAccount

        setDerivedAccounts([...newAccounts])
      }
    } catch (err) {
      const error = err as Error & { statusCode?: number }
      // eslint-disable-next-line no-console
      DEBUG && console.error(error.message, err)
      if (error.message?.toLowerCase().includes("busy")) setError(t("Ledger is busy"))
      else if (error.message?.toLowerCase().includes("disconnected"))
        setError(t("Ledger is disconnected"))
      else if (error.statusCode === 27404) setError(t("Ledger is locked"))
      else setError(t("Failed to connect to Ledger"))
    }
    setIsBusy(false)
  }, [derivationPathType, isReady, itemsPerPage, ledger, name, pageIndex, t])

  const withBalances = useMemo(() => !!derivedAccounts?.length, [derivedAccounts?.length])

  // start fetching balances only once all accounts are loaded to prevent recreating subscription 5 times
  const accountImportDefs = useMemo<AccountImportDef[]>(
    () =>
      derivedAccounts.filter(Boolean).length
        ? derivedAccounts
            .filter((acc): acc is LedgerEthereumAccount => !!acc)
            .map((acc) => ({ address: acc.address, type: "ethereum" }))
        : [],
    [derivedAccounts]
  )
  const balances = useAccountImportBalances(accountImportDefs)

  const accounts = useMemo(
    () =>
      derivedAccounts.map((acc) => {
        if (!acc) return null

        const existingAccount = walletAccounts?.find(
          (wa) => convertAddress(wa.address, null) === convertAddress(acc.address, null)
        )

        const accountBalances = balances.balances.find(
          (b) => convertAddress(b.address, null) === convertAddress(acc.address, null)
        )
        const isBalanceLoading =
          accountBalances.each.some((b) => b.status === "cache") ||
          balances.status === "initialising"

        return {
          ...acc,
          name: existingAccount?.name ?? acc.name,
          connected: !!existingAccount,
          selected: selectedAccounts.some((sa) => sa.path === acc.path),
          balances: accountBalances,
          isBalanceLoading,
        }
      }),
    [balances, derivedAccounts, selectedAccounts, walletAccounts]
  )

  useEffect(() => {
    // refresh on every page change
    loadPage()
  }, [loadPage])

  return {
    accounts,
    withBalances,
    isBusy,
    error,
    connectionStatus,
  }
}

type LedgerEthereumAccountPickerProps = {
  name: string
  derivationPathType: LedgerEthDerivationPathType
  onChange?: (accounts: LedgerAccountDefEthereum[]) => void
}

type LedgerEthereumAccount = DerivedAccountBase & LedgerAccountDefEthereum

export const LedgerEthereumAccountPicker: FC<LedgerEthereumAccountPickerProps> = ({
  name,
  derivationPathType,
  onChange,
}) => {
  const itemsPerPage = 5
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedAccounts, setSelectedAccounts] = useState<LedgerAccountDefEthereum[]>([])
  const { accounts, error, isBusy, withBalances } = useLedgerEthereumAccounts(
    name,
    derivationPathType,
    selectedAccounts,
    pageIndex,
    itemsPerPage
  )

  const handleToggleAccount = useCallback((acc: DerivedAccountBase) => {
    const { name, address, path } = acc as LedgerEthereumAccount
    setSelectedAccounts((prev) =>
      prev.some((pa) => pa.path === path)
        ? prev.filter((pa) => pa.path !== path)
        : prev.concat({ name, address, path })
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
        withBalances={withBalances}
        canPageBack={pageIndex > 0}
        disablePaging={isBusy}
        onAccountClick={handleToggleAccount}
        onPagerFirstClick={handlePageFirst}
        onPagerPrevClick={handlePagePrev}
        onPagerNextClick={handlePageNext}
      />
      <p className="text-alert-error">{error}</p>
    </>
  )
}
