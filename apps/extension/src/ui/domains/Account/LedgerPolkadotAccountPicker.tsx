import { convertAddress } from "@talisman/util/convertAddress"
import { LedgerAccountDefPolkadot } from "@ui/domains/Account/AccountAdd/AccountAddLedger/context"
import { getPolkadotLedgerDerivationPath } from "@ui/hooks/ledger/common"
import { useLedgerPolkadot } from "@ui/hooks/ledger/useLedgerPolkadot"
import { AccountImportDef, useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
import useAccounts from "@ui/hooks/useAccounts"
import { log } from "extension-shared"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { DerivedAccountBase, DerivedAccountPickerBase } from "./DerivedAccountPickerBase"

const useLedgerPolkadotAccounts = (
  selectedAccounts: LedgerAccountDefPolkadot[],
  pageIndex: number,
  itemsPerPage: number
) => {
  const walletAccounts = useAccounts()
  const { t } = useTranslation()

  const [ledgerAccounts, setLedgerAccounts] = useState<(LedgerPolkadotAccount | undefined)[]>([
    ...Array(itemsPerPage),
  ])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string>()

  const { isReady, ledger, ...connectionStatus } = useLedgerPolkadot()

  const loadPage = useCallback(async () => {
    if (!ledger || !isReady) return

    setIsBusy(true)
    setError(undefined)

    const skip = pageIndex * itemsPerPage

    try {
      const newAccounts: (LedgerPolkadotAccount | undefined)[] = [...Array(itemsPerPage)]

      for (let i = 0; i < itemsPerPage; i++) {
        const accountIndex = skip + i
        const path = getPolkadotLedgerDerivationPath(accountIndex, 0)
        const { address } = await ledger.getAddress(path, 42, false)

        newAccounts[i] = {
          accountIndex,
          addressOffset: 0,
          address,
          name: t("Ledger Polkadot {{accountIndex}}", { accountIndex: accountIndex + 1 }),
          path,
        } as LedgerPolkadotAccount

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
            .filter((acc): acc is LedgerPolkadotAccount => !!acc)
            .map((acc) => ({ address: acc.address, type: "ecdsa", genesisHash: acc.genesisHash }))
        : [],
    [itemsPerPage, ledgerAccounts]
  )
  const balances = useAccountImportBalances(accountImportDefs)

  const accounts: (LedgerPolkadotAccount | null)[] = useMemo(
    () =>
      ledgerAccounts.map((acc) => {
        if (!acc) return null

        const address = convertAddress(acc.address, null)
        const existingAccount = walletAccounts?.find(
          (wa) => convertAddress(wa.address, null) === address
        )

        const accountBalances = balances.balances.find(
          (b) => convertAddress(b.address, null) === address
        )

        return {
          ...acc,
          name: existingAccount?.name ?? acc.name,
          connected: !!existingAccount,
          selected: selectedAccounts.some((sa) => sa.address === acc.address),
          balances: accountBalances,
          isBalanceLoading: balances.status === "initialising" || balances.status === "cached",
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

type LedgerPolkadotAccountPickerProps = {
  onChange?: (accounts: LedgerAccountDefPolkadot[]) => void
}

type LedgerPolkadotAccount = DerivedAccountBase & LedgerAccountDefPolkadot

export const LedgerPolkadotAccountPicker: FC<LedgerPolkadotAccountPickerProps> = ({ onChange }) => {
  const { t } = useTranslation()
  const itemsPerPage = 5
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedAccounts, setSelectedAccounts] = useState<LedgerAccountDefPolkadot[]>([])
  const { accounts, error, isBusy } = useLedgerPolkadotAccounts(
    selectedAccounts,
    pageIndex,
    itemsPerPage
  )

  const handleToggleAccount = useCallback((acc: DerivedAccountBase) => {
    const { address, name, path } = acc as LedgerPolkadotAccount
    setSelectedAccounts((prev) =>
      prev.some((pa) => pa.address === address)
        ? prev.filter((pa) => pa.address !== address)
        : prev.concat({ path, address, name })
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
