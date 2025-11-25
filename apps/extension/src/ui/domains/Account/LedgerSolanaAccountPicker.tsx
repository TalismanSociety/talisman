import { encodeAddressSolana, isAddressEqual } from "@talismn/crypto"
import { isNotNil } from "@talismn/util"
import { Account, getSolLedgerDerivationPath, LedgerSolDerivationPathType } from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { LedgerAccountDefSolana } from "@ui/domains/Account/AccountAdd/AccountAddLedger/context"
import { getTalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerSolana } from "@ui/hooks/ledger/useLedgerSolana"
import { useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
import { useAccounts, useNetworks } from "@ui/state"

import { DerivedAccountBase, DerivedAccountPickerBase } from "./DerivedAccountPickerBase"
import { LedgerConnectionStatus, LedgerConnectionStatusProps } from "./LedgerConnectionStatus"

const useLedgerSolanaAccounts = (
  name: string,
  derivationPathType: LedgerSolDerivationPathType,
  selectedAccounts: LedgerAccountDefSolana[],
  pageIndex: number,
  itemsPerPage: number,
) => {
  const { t } = useTranslation()
  const walletAccounts = useAccounts()
  const [derivedAccounts, setDerivedAccounts] = useState<(LedgerSolanaAccount | undefined)[]>([
    ...Array(itemsPerPage),
  ])

  const refIsBusy = useRef(false)

  const { getAddress } = useLedgerSolana()

  const [connectionStatus, setConnectionStatus] = useState<LedgerConnectionStatusProps>({
    status: "connecting",
    message: t("Fetching account addresses..."),
  })

  // derivation path => address cache, used when going back to previous page
  const refAddressCache = useRef<Record<string, { address: string }>>({})
  useEffect(() => {
    refAddressCache.current = {} // reset if app changes
  }, [])

  const solNetworks = useNetworks({
    platform: "solana",
    activeOnly: true,
    includeTestnets: false,
  })
  const withBalances = useMemo(() => !!solNetworks.length, [solNetworks])

  // keep page index as ref to allow for cancelling current page load when changing page
  const refPageIndex = useRef(pageIndex)
  useEffect(() => {
    refPageIndex.current = pageIndex
  }, [pageIndex])

  const loadPage = useCallback(
    async (pageIndex: number, force = false) => {
      if (!force && refIsBusy.current) return
      refIsBusy.current = true

      //  setError(undefined)
      setConnectionStatus({
        status: "connecting",
        message: t("Fetching account addresses..."),
      })

      const skip = pageIndex * itemsPerPage

      try {
        const newAccounts: (LedgerSolanaAccount | undefined)[] = [...Array(itemsPerPage)]
        setDerivedAccounts([...newAccounts])

        for (let i = 0; i < itemsPerPage; i++) {
          if (refPageIndex.current !== pageIndex) return loadPage(refPageIndex.current, true)

          const accountIndex = skip + i
          const path = getSolLedgerDerivationPath(derivationPathType, accountIndex)

          const { address } = refAddressCache.current[path] ?? {
            address: encodeAddressSolana((await getAddress(path)).address),
          }

          if (refPageIndex.current !== pageIndex) return loadPage(refPageIndex.current, true)
          if (!address) throw new Error("Unable to get address")
          refAddressCache.current[path] = { address }

          newAccounts[i] = {
            type: "ledger-solana",
            derivationPath: path,
            accountIndex,
            name: `${name.trim()} ${accountIndex + 1}`,
            address,
          } as LedgerSolanaAccount

          setDerivedAccounts([...newAccounts])
        }

        setConnectionStatus({
          status: "ready",
          message: t("Ledger is ready."),
        })
      } catch (err) {
        const error = getTalismanLedgerError(err)
        log.error("Failed to load page", { err })
        setConnectionStatus({
          status: "error",
          message: error.message,
          onRetryClick: () => loadPage(pageIndex),
        })
      } finally {
        refIsBusy.current = false
      }
    },
    [derivationPathType, getAddress, itemsPerPage, name, t],
  )

  // start fetching balances only once all accounts are loaded to prevent recreating subscription 5 times
  const balanceDefs = useMemo(
    () =>
      withBalances && derivedAccounts.filter(isNotNil).length === itemsPerPage
        ? derivedAccounts.filter(isNotNil).map(
            ({ address }): Account => ({
              type: "ledger-solana",
              address,
              name: "",
              createdAt: Date.now(),
              derivationPath: "",
            }),
          )
        : [],
    [derivedAccounts, itemsPerPage, withBalances],
  )
  const balances = useAccountImportBalances(balanceDefs)

  const accounts = useMemo(
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
          withBalances &&
          (accountBalances.each.some((b) => b.status === "cache") ||
            balances.status === "initialising")

        return {
          ...acc,
          name: existingAccount?.name ?? acc.name,
          connected: !!existingAccount,
          selected: selectedAccounts.some((sa) => sa.derivationPath === acc.derivationPath),
          balances: accountBalances,
          isBalanceLoading,
        }
      }),
    [balances, derivedAccounts, selectedAccounts, walletAccounts, withBalances],
  )

  useEffect(() => {
    // refresh on every page change
    loadPage(pageIndex)
  }, [loadPage, pageIndex])

  return {
    accounts,
    withBalances,
    connectionStatus,
  }
}

type LedgerSolanaAccountPickerProps = {
  name: string
  derivationPathType: LedgerSolDerivationPathType
  onChange?: (accounts: LedgerAccountDefSolana[]) => void
}

type LedgerSolanaAccount = DerivedAccountBase & LedgerAccountDefSolana

export const LedgerSolanaAccountPicker: FC<LedgerSolanaAccountPickerProps> = ({
  name,
  derivationPathType,
  onChange,
}) => {
  const itemsPerPage = 5
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedAccounts, setSelectedAccounts] = useState<LedgerAccountDefSolana[]>([])
  const { accounts, withBalances, connectionStatus } = useLedgerSolanaAccounts(
    name,
    derivationPathType,
    selectedAccounts,
    pageIndex,
    itemsPerPage,
  )

  const handleToggleAccount = useCallback((acc: DerivedAccountBase) => {
    const { name, address, derivationPath } = acc as LedgerSolanaAccount
    setSelectedAccounts((prev) =>
      prev.some((pa) => pa.derivationPath === derivationPath)
        ? prev.filter((pa) => pa.derivationPath !== derivationPath)
        : prev.concat({
            type: "ledger-solana",
            name,
            address,
            derivationPath,
          }),
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
      <div className="mb-8">
        <LedgerConnectionStatus {...connectionStatus} />
      </div>
      <DerivedAccountPickerBase
        accounts={accounts}
        withBalances={withBalances}
        canPageBack={pageIndex > 0}
        onAccountClick={handleToggleAccount}
        onPagerFirstClick={handlePageFirst}
        onPagerPrevClick={handlePagePrev}
        onPagerNextClick={handlePageNext}
      />
    </>
  )
}
