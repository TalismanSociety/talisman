import { KeypairCurve } from "@talismn/crypto"
import {
  formatSuri,
  getAccountGenesisHash,
  getEthDerivationPath,
  RequestAccountCreateFromSuri,
} from "extension-core"
import { FC, useCallback, useEffect, useMemo, useState } from "react"

import { convertAddress } from "@talisman/util/convertAddress"
import { api } from "@ui/api"
import { AccountImportDef, useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
import { useAccounts } from "@ui/state"

import { DerivedAccountBase, DerivedAccountPickerBase } from "./DerivedAccountPickerBase"

const getDerivationPath = (curve: KeypairCurve, index: number) => {
  switch (curve) {
    case "ethereum":
      return getEthDerivationPath(index)
    default:
      // preserve backwards compatibility : since beta we import mnemonics as-is, without derivationPath
      return index === 0 ? "" : `//${index - 1}`
  }
}

const useDerivedAccounts = (
  name: string,
  mnemonic: string,
  curve: KeypairCurve,
  selectedAccounts: RequestAccountCreateFromSuri[],
  pageIndex: number,
  itemsPerPage: number,
) => {
  const walletAccounts = useAccounts()
  const [derivedAccounts, setDerivedAccounts] = useState<
    (DerivedFromMnemonicAccount | undefined)[]
  >([...Array(itemsPerPage)])
  const [error, setError] = useState<string>()

  const loadPage = useCallback(async () => {
    setError(undefined)

    try {
      const skip = pageIndex * itemsPerPage

      const newAccounts: DerivedFromMnemonicAccount[] = await Promise.all(
        // maps [0, 1, 2, ..., itemsPerPage - 1] dynamically
        Array.from(Array(itemsPerPage).keys()).map(async (i) => {
          const accountIndex = skip + i
          const suri = formatSuri(mnemonic, getDerivationPath(curve, accountIndex))
          const address = await api.addressLookup({ suri, curve })

          return {
            accountIndex,
            name: `${name}${accountIndex === 0 ? "" : ` ${accountIndex}`}`,
            suri,
            curve,
            address,
          } as DerivedFromMnemonicAccount
        }),
      )

      setDerivedAccounts(newAccounts)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [itemsPerPage, mnemonic, name, pageIndex, curve])

  const withBalances = useMemo(() => !!derivedAccounts.filter(Boolean).length, [derivedAccounts])

  // start fetching balances only once all accounts are loaded to prevent recreating subscription 5 times
  const accountImportDefs = useMemo<AccountImportDef[]>(
    () =>
      derivedAccounts.filter(Boolean).length === itemsPerPage
        ? derivedAccounts
            .filter((acc): acc is DerivedFromMnemonicAccount & { curve: string } => !!acc?.curve)
            .map((acc) => ({ address: acc.address, curve: acc.curve }))
        : [],
    [itemsPerPage, derivedAccounts],
  )
  const balances = useAccountImportBalances(accountImportDefs)

  const accounts: (DerivedFromMnemonicAccount | null)[] = useMemo(
    () =>
      derivedAccounts.map((acc) => {
        if (!acc) return null

        const existingAccount = walletAccounts?.find(
          (wa) =>
            convertAddress(wa.address, null) === convertAddress(acc.address, null) &&
            acc.genesisHash === getAccountGenesisHash(wa),
        )

        const accountBalances = balances.balances.find(
          (b) => convertAddress(b.address, null) === convertAddress(acc.address, null),
        )

        const isBalanceLoading =
          accountBalances.each.some((b) => b.status === "cache") ||
          balances.status === "initialising"

        return {
          ...acc,
          name: existingAccount?.name ?? acc.name,
          connected: !!existingAccount,
          selected: selectedAccounts.some((sa) => sa.suri === acc.suri),
          balances: accountBalances,
          isBalanceLoading,
        }
      }),
    [balances, derivedAccounts, selectedAccounts, walletAccounts],
  )

  useEffect(() => {
    // refresh on every page change
    loadPage()
  }, [loadPage])

  return {
    accounts,
    withBalances,
    error,
  }
}

type DerivedAccountPickerProps = {
  name: string
  mnemonic: string
  curve: KeypairCurve
  onChange?: (accounts: RequestAccountCreateFromSuri[]) => void
}

type DerivedFromMnemonicAccount = DerivedAccountBase & RequestAccountCreateFromSuri

export const DerivedFromMnemonicAccountPicker: FC<DerivedAccountPickerProps> = ({
  name,
  mnemonic,
  curve,
  onChange,
}) => {
  const itemsPerPage = 5
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedAccounts, setSelectedAccounts] = useState<RequestAccountCreateFromSuri[]>([])
  const { accounts, withBalances, error } = useDerivedAccounts(
    name,
    mnemonic,
    curve,
    selectedAccounts,
    pageIndex,
    itemsPerPage,
  )

  const handleToggleAccount = useCallback((acc: DerivedAccountBase) => {
    const { name, suri, curve } = acc as DerivedFromMnemonicAccount
    setSelectedAccounts((prev) =>
      prev.some((pa) => pa.suri === suri)
        ? prev.filter((pa) => pa.suri !== suri)
        : prev.concat({ name, suri, curve }),
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
        onAccountClick={handleToggleAccount}
        onPagerFirstClick={handlePageFirst}
        onPagerPrevClick={handlePagePrev}
        onPagerNextClick={handlePageNext}
      />
      <p className="text-alert-error">{error}</p>
    </>
  )
}
