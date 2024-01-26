import { isChainActive } from "@core/domains/chains/store.activeChains"
import { log } from "@core/log"
import { AddressesByChain } from "@core/types/base"
import { convertAddress } from "@talisman/util/convertAddress"
import { LedgerAccountDefSubstrateLegacy } from "@ui/domains/Account/AccountAdd/AccountAddLedger/context" // Todo
import { useLedgerSubstrateLegacy } from "@ui/hooks/ledger/useLedgerSubstrateLegacy"
import { useLedgerSubstrateLegacyApp } from "@ui/hooks/ledger/useLedgerSubstrateLegacyApp"
import useAccounts from "@ui/hooks/useAccounts"
import { useActiveChainsState } from "@ui/hooks/useActiveChainsState"
import useBalancesByParams from "@ui/hooks/useBalancesByParams"
import useChain from "@ui/hooks/useChain"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { DerivedAccountBase, DerivedAccountPickerBase } from "./DerivedAccountPickerBase"

const useLedgerChainAccounts = (
  chainId: string,
  selectedAccounts: LedgerAccountDefSubstrateLegacy[],
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

  const addressesByChain = useMemo(() => {
    // start fetching balances only when all accounts are known to prevent recreating subscription 5 times
    if (ledgerAccounts.filter(Boolean).length < ledgerAccounts.length) return undefined

    if (!chain || !isChainActive(chain, activeChains)) return {}

    const result: AddressesByChain = {
      [chain.id]: ledgerAccounts
        .filter((acc) => !!acc)
        .map((acc) => acc as LedgerSubstrateAccount)
        .map((account) => convertAddress(account.address, chain.prefix)),
    }

    return result
  }, [chain, activeChains, ledgerAccounts])

  const balances = useBalancesByParams({ addressesByChain })

  const accounts: (LedgerSubstrateAccount | null)[] = useMemo(
    () =>
      ledgerAccounts.map((acc) => {
        if (!acc) return null

        const address = convertAddress(acc.address, null)
        const existingAccount = walletAccounts?.find(
          (wa) => convertAddress(wa.address, null) === address && acc.genesisHash === wa.genesisHash
        )

        const accountBalances = balances.find(
          (b) => convertAddress(b.address, null) === address && b.chainId === chain?.id
        )

        return {
          ...acc,
          name: existingAccount?.name ?? acc.name,
          connected: !!existingAccount,
          selected: selectedAccounts.some((sa) => sa.address === acc.address),
          balances: accountBalances,
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
  onChange?: (accounts: LedgerAccountDefSubstrateLegacy[]) => void
}

type LedgerSubstrateAccount = DerivedAccountBase & LedgerAccountDefSubstrateLegacy

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
        : prev.concat({ accountIndex, address, addressOffset, genesisHash, name })
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
