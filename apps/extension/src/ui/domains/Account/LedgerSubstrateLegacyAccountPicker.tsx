import { SubstrateLedgerAppType, isChainActive } from "@extension/core"
import { log } from "@extension/shared"
import { convertAddress } from "@talisman/util/convertAddress"
import { validateHexString } from "@talismn/util"
import { useLedgerSubstrateLegacy } from "@ui/hooks/ledger/useLedgerSubstrateLegacy"
import { useLedgerSubstrateLegacyApp } from "@ui/hooks/ledger/useLedgerSubstrateLegacyApp"
import { AccountImportDef, useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
import useAccounts from "@ui/hooks/useAccounts"
import { useActiveChainsState } from "@ui/hooks/useActiveChainsState"
import useChain from "@ui/hooks/useChain"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  LedgerAccountDefSubstrate,
  LedgerAccountDefSubstrateLegacy,
} from "./AccountAdd/AccountAddLedger/context"
import { DerivedAccountBase, DerivedAccountPickerBase } from "./DerivedAccountPickerBase"

const useLedgerChainAccounts = (
  chainId: string,
  selectedAccounts: LedgerAccountDefSubstrate[],
  pageIndex: number,
  itemsPerPage: number
) => {
  const walletAccounts = useAccounts()
  const { t } = useTranslation()
  const chain = useChain(chainId)
  const app = useLedgerSubstrateLegacyApp(chain?.genesisHash)
  const activeChains = useActiveChainsState()
  const withBalances = useMemo(
    () => !!chain && isChainActive(chain, activeChains),
    [chain, activeChains]
  )

  const [ledgerAccounts, setLedgerAccounts] = useState<(LedgerSubstrateAccount | undefined)[]>([
    ...Array(itemsPerPage),
  ])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string>()

  const { isReady, ledger, ...connectionStatus } = useLedgerSubstrateLegacy(chain?.genesisHash)

  const loadPage = useCallback(async () => {
    if (!app || !ledger || !isReady || !chain) return

    setIsBusy(true)
    setError(undefined)

    const skip = pageIndex * itemsPerPage

    try {
      const newAccounts: (LedgerSubstrateAccount | undefined)[] = [...Array(itemsPerPage)]

      for (let i = 0; i < itemsPerPage; i++) {
        const accountIndex = skip + i
        const { address } = await ledger.getAddress(false, accountIndex, 0)

        newAccounts[i] = {
          genesisHash: chain.genesisHash as string,
          accountIndex,
          addressOffset: 0,
          address,
          name: t("Ledger {{appLabel}} {{accountIndex}}", {
            appLabel: app.label,
            accountIndex: accountIndex + 1,
          }),
        } as LedgerSubstrateAccount

        setLedgerAccounts([...newAccounts])
      }
    } catch (err) {
      log.error("Failed to load page", { err })
      setError((err as Error).message)
    }

    setIsBusy(false)
  }, [app, chain, isReady, itemsPerPage, ledger, pageIndex, t])

  // start fetching balances only once all accounts are loaded to prevent recreating subscription 5 times
  const accountImportDefs = useMemo<AccountImportDef[]>(
    () =>
      ledgerAccounts.filter(Boolean).length === itemsPerPage
        ? ledgerAccounts
            .filter((acc): acc is LedgerSubstrateAccount => !!acc)
            .map((acc) => ({ address: acc.address, type: "ed25519", genesisHash: acc.genesisHash }))
        : [],
    [itemsPerPage, ledgerAccounts]
  )
  const balances = useAccountImportBalances(accountImportDefs)

  const accounts: (LedgerSubstrateAccount | null)[] = useMemo(
    () =>
      ledgerAccounts.map((acc) => {
        if (!acc) return null

        const existingAccount = walletAccounts?.find(
          (wa) =>
            convertAddress(wa.address, null) === convertAddress(acc.address, null) &&
            acc.genesisHash === wa.genesisHash
        )

        const accountBalances = balances.balances.find(
          (b) =>
            convertAddress(b.address, null) === convertAddress(acc.address, null) &&
            b.chainId === chain?.id
        )

        const isBalanceLoading =
          accountBalances.each.some((b) => b.status === "cache") ||
          balances.status === "initialising"
        return {
          ...acc,
          name: existingAccount?.name ?? acc.name,
          connected: !!existingAccount,
          selected: selectedAccounts.some((sa) => sa.address === acc.address),
          balances: accountBalances,
          isBalanceLoading,
        }
      }),
    [balances, chain?.id, ledgerAccounts, selectedAccounts, walletAccounts]
  )

  useEffect(() => {
    // refresh on every page change
    loadPage()
  }, [loadPage])

  return {
    chain,
    ledger,
    accounts,
    isBusy,
    error,
    connectionStatus,
    withBalances,
  }
}

type LedgerSubstrateAccountPickerProps = {
  chainId: string
  onChange?: (accounts: LedgerAccountDefSubstrate[]) => void
}

type LedgerSubstrateAccount = DerivedAccountBase & LedgerAccountDefSubstrate

export const LedgerSubstrateAccountPicker: FC<LedgerSubstrateAccountPickerProps> = ({
  chainId,
  onChange,
}) => {
  const { t } = useTranslation()
  const itemsPerPage = 5
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedAccounts, setSelectedAccounts] = useState<LedgerAccountDefSubstrateLegacy[]>([])
  const { accounts, withBalances, error, isBusy } = useLedgerChainAccounts(
    chainId,
    selectedAccounts,
    pageIndex,
    itemsPerPage
  )

  const handleToggleAccount = useCallback((acc: DerivedAccountBase) => {
    const { accountIndex, address, addressOffset, genesisHash, name } =
      acc as LedgerSubstrateAccount
    setSelectedAccounts((prev) =>
      prev.some((pa) => pa.address === address)
        ? prev.filter((pa) => pa.address !== address)
        : prev.concat({
            ledgerApp: SubstrateLedgerAppType.Legacy,
            accountIndex,
            address,
            addressOffset,
            genesisHash: validateHexString(genesisHash as string),
            name,
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
        withBalances={withBalances}
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
