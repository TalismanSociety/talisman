import { isAddressEqual, KeypairCurve } from "@talismn/crypto"
import { isNotNil } from "@talismn/util"
import { Account, AddAccountDeriveOptions, getDerivationPathForCurve } from "extension-core"
import { FC, useCallback, useEffect, useMemo, useState } from "react"

import { api } from "@ui/api"
import { useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
import { useAccounts } from "@ui/state"

import { DerivedAccountBase, DerivedAccountPickerBase } from "./DerivedAccountPickerBase"

const getDerivationPath = (curve: KeypairCurve, index: number) => {
  switch (curve) {
    case "sr25519":
    case "ed25519":
    case "ecdsa": {
      // for substrate, first account should have an empty derivation path
      // preserve backwards compatibility : since beta we import mnemonics as-is, without derivationPath
      return index === 0 ? "" : `//${index - 1}`
    }
    default:
      return getDerivationPathForCurve(curve, index)
  }
}

const useDerivedAccounts = (
  name: string,
  mnemonic: string,
  curve: KeypairCurve,
  selectedAccounts: AddAccountDeriveOptions[],
  pageIndex: number,
  itemsPerPage: number,
) => {
  const walletAccounts = useAccounts()
  const [derivedAccounts, setDerivedAccounts] = useState<DerivedFromMnemonicAccount[]>([
    ...Array(itemsPerPage),
  ])
  const [error, setError] = useState<string>()

  const loadPage = useCallback(async () => {
    setError(undefined)

    try {
      const skip = pageIndex * itemsPerPage

      const newAccounts: DerivedFromMnemonicAccount[] = await Promise.all(
        // maps [0, 1, 2, ..., itemsPerPage - 1] dynamically
        Array.from(Array(itemsPerPage).keys()).map(async (i) => {
          const accountIndex = skip + i
          const address = await api.addressLookup({
            type: "mnemonic",
            mnemonic,
            derivationPath: getDerivationPath(curve, accountIndex),
            curve,
          })

          return {
            accountIndex,
            name: `${name}${accountIndex === 0 ? "" : ` ${accountIndex}`}`,
            curve,
            address,
            options: {
              type: "new-mnemonic",
              mnemonic,
              mnemonicName: `${name} Recovery Phrase`,
              derivationPath: getDerivationPath(curve, accountIndex),
              name: `${name}${accountIndex === 0 ? "" : ` ${accountIndex}`}`,
              confirmed: true,
              curve,
            },
          } as DerivedFromMnemonicAccount
        }),
      )

      setDerivedAccounts(newAccounts)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [itemsPerPage, mnemonic, name, pageIndex, curve])

  const withBalances = useMemo(() => !!derivedAccounts.filter(isNotNil).length, [derivedAccounts])

  // start fetching balances only once all accounts are loaded to prevent recreating subscription 5 times
  const accountImportDefs = useMemo(
    () =>
      derivedAccounts.filter(isNotNil).length === itemsPerPage
        ? derivedAccounts
            // .filter((acc): acc is DerivedFromMnemonicAccount => !!acc?.c)
            .map(
              (acc): Account => ({
                type: "keypair",
                address: acc.address,
                curve: acc.options.curve,
                name: "",
                createdAt: Date.now(),
              }),
            )
        : [],
    [itemsPerPage, derivedAccounts],
  )
  const balances = useAccountImportBalances(accountImportDefs)

  const accounts: (DerivedFromMnemonicAccount | null)[] = useMemo(
    () =>
      derivedAccounts.map((acc) => {
        if (!acc) return null

        const existingAccount = walletAccounts?.find((wa) =>
          isAddressEqual(wa.address, acc.address),
        )

        const accountBalances = balances.balances.find((b) =>
          isAddressEqual(b.address, acc.address),
        )

        const isBalanceLoading =
          accountBalances.each.some((b) => b.status === "cache") ||
          balances.status === "initialising"

        return {
          ...acc,
          name: existingAccount?.name ?? acc.name,
          connected: !!existingAccount,
          selected: selectedAccounts.some((sa) => sa.derivationPath === acc.options.derivationPath),
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

  useEffect(() => {
    // memory cleanup on unmount
    return () => {
      setDerivedAccounts([])
    }
  }, [])

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
  onChange?: (accounts: AddAccountDeriveOptions[]) => void
}

type DerivedFromMnemonicAccount = DerivedAccountBase & { options: AddAccountDeriveOptions }

export const DerivedFromMnemonicAccountPicker: FC<DerivedAccountPickerProps> = ({
  name,
  mnemonic,
  curve,
  onChange,
}) => {
  const itemsPerPage = 5
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<AddAccountDeriveOptions[]>([])
  const { accounts, withBalances, error } = useDerivedAccounts(
    name,
    mnemonic,
    curve,
    selectedOptions,
    pageIndex,
    itemsPerPage,
  )

  const handleToggleAccount = useCallback((acc: DerivedAccountBase) => {
    const derivedAccount = acc as DerivedFromMnemonicAccount
    setSelectedOptions((prev) =>
      prev.some((po) => po.derivationPath === derivedAccount.options.derivationPath)
        ? prev.filter((pa) => pa.derivationPath !== derivedAccount.options.derivationPath)
        : prev.concat(derivedAccount.options),
    )
  }, [])

  useEffect(() => {
    if (onChange) onChange(selectedOptions)
  }, [onChange, selectedOptions])

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
