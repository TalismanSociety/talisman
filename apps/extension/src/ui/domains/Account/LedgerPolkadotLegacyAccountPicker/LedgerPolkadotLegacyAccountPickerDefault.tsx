import { isAddressEqual } from "@talismn/crypto"
import { isNotNil, validateHexString } from "@talismn/util"
import { Account, getAccountGenesisHash, isNetworkActive } from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { getTalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerSubstrateLegacy } from "@ui/hooks/ledger/useLedgerSubstrateLegacy"
import { useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
import { useAccounts, useActiveNetworksState, useNetworkById } from "@ui/state"

import { LedgerAccountDefSubstrate } from "../AccountAdd/AccountAddLedger/context"
import { DerivedAccountBase, DerivedAccountPickerBase } from "../DerivedAccountPickerBase"
import { LedgerConnectionStatus, LedgerConnectionStatusProps } from "../LedgerConnectionStatus"
import { LedgerPolkadotAccountPickerDef, LedgerPolkadotLegacyAccountPickerProps } from "./types"

export const LedgerPolkadotLegacyAccountPickerDefault: FC<
  LedgerPolkadotLegacyAccountPickerProps
> = ({ chainId, onChange }) => {
  const itemsPerPage = 5
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedAccounts, setSelectedAccounts] = useState<LedgerAccountDefSubstrate[]>([])
  const { accounts, withBalances, chain, connectionStatus } = useLedgerChainAccounts(
    chainId,
    selectedAccounts,
    pageIndex,
    itemsPerPage,
  )

  const handleToggleAccount = useCallback((acc: DerivedAccountBase) => {
    const { accountIndex, address, addressOffset, genesisHash, name, app } =
      acc as LedgerPolkadotAccountPickerDef
    setSelectedAccounts((prev) =>
      prev.some((pa) => pa.address === address)
        ? prev.filter((pa) => pa.address !== address)
        : prev.concat({
            type: "ledger-polkadot",
            name,
            address,
            app,
            accountIndex,
            addressOffset,
            curve: "ed25519",
            genesisHash: validateHexString(genesisHash as string),
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
        ss58Format={chain?.prefix}
        canPageBack={pageIndex > 0}
        onAccountClick={handleToggleAccount}
        onPagerFirstClick={handlePageFirst}
        onPagerPrevClick={handlePagePrev}
        onPagerNextClick={handlePageNext}
      />
    </>
  )
}

const useLedgerChainAccounts = (
  chainId: string,
  selectedAccounts: LedgerAccountDefSubstrate[],
  pageIndex: number,
  itemsPerPage: number,
) => {
  const walletAccounts = useAccounts()
  const { t } = useTranslation()
  const chain = useNetworkById(chainId, "polkadot")
  const activeChains = useActiveNetworksState()
  const withBalances = useMemo(
    () => !chain?.isTestnet && !!chain && isNetworkActive(chain, activeChains),
    [chain, activeChains],
  )

  const { getAddress, app } = useLedgerSubstrateLegacy(chain?.genesisHash)

  const [connectionStatus, setConnectionStatus] = useState<LedgerConnectionStatusProps>({
    status: "connecting",
    message: t("Fetching account addresses..."),
  })

  const [ledgerAccounts, setLedgerAccounts] = useState<
    (LedgerPolkadotAccountPickerDef | undefined)[]
  >([...Array(itemsPerPage)])

  const refIsBusy = useRef(false)

  // derivation path => address cache, used when going back to previous page
  const refAddressCache = useRef<Record<string, { address: string }>>({})
  useEffect(() => {
    refAddressCache.current = {} // reset if app changes
  }, [app])

  // keep page index as ref to allow for cancelling current page load when changing page
  const refPageIndex = useRef(pageIndex)
  useEffect(() => {
    refPageIndex.current = pageIndex
  }, [pageIndex])

  const loadPage = useCallback(
    async (pageIndex: number, force = false) => {
      if (!app || !chain) return
      if (!force && refIsBusy.current) return
      refIsBusy.current = true

      setConnectionStatus({
        status: "connecting",
        message: t("Fetching account addresses..."),
      })

      const skip = pageIndex * itemsPerPage

      try {
        const newAccounts: (LedgerPolkadotAccountPickerDef | undefined)[] = [...Array(itemsPerPage)]
        setLedgerAccounts([...newAccounts])

        for (let i = 0; i < itemsPerPage; i++) {
          if (refPageIndex.current !== pageIndex) return loadPage(refPageIndex.current, true)
          const accountIndex = skip + i
          const addressOffset = 0

          const cacheKey = `${accountIndex}-${addressOffset}`
          const { address } =
            refAddressCache.current[cacheKey] ?? (await getAddress(accountIndex, addressOffset))
          if (refPageIndex.current !== pageIndex) return loadPage(refPageIndex.current, true)
          if (!address) throw new Error("Unable to get address")
          refAddressCache.current[cacheKey] = { address }

          newAccounts[i] = {
            type: "ledger-polkadot",
            curve: "ed25519",
            app: app.name,
            genesisHash: chain.genesisHash as `0x${string}`,
            accountIndex,
            addressOffset,
            address,
            name: t("Ledger {{appLabel}} {{accountIndex}}", {
              appLabel: app.name,
              accountIndex: accountIndex + 1,
            }),
          }

          setLedgerAccounts([...newAccounts])
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
    [app, chain, getAddress, itemsPerPage, t],
  )

  // start fetching balances only once all accounts are loaded to prevent recreating subscription 5 times
  const balanceDefs = useMemo<Account[]>(
    () =>
      withBalances && ledgerAccounts.filter(isNotNil).length === itemsPerPage
        ? ledgerAccounts.filter(isNotNil).map(
            (acc): Account => ({
              ...acc,
              createdAt: 0,
            }),
          )
        : [],
    [withBalances, itemsPerPage, ledgerAccounts],
  )
  const balances = useAccountImportBalances(balanceDefs)

  const accounts: (LedgerPolkadotAccountPickerDef | null)[] = useMemo(
    () =>
      ledgerAccounts.map((acc) => {
        if (!acc) return null

        const existingAccount = walletAccounts?.find(
          (wa) =>
            isAddressEqual(wa.address, acc.address) &&
            acc.genesisHash === getAccountGenesisHash(wa),
        )

        const accountBalances = balances.balances.find(
          (b) => isAddressEqual(b.address, acc.address) && b.networkId === chain?.id,
        )

        const isBalanceLoading =
          withBalances &&
          (accountBalances.each.some((b) => b.status === "cache") ||
            balances.status === "initialising")

        return {
          ...acc,
          name: existingAccount?.name ?? acc.name,
          connected: !!existingAccount,
          selected: selectedAccounts.some((sa) => sa.address === acc.address),
          balances: accountBalances,
          isBalanceLoading,
        }
      }),
    [
      balances.balances,
      balances.status,
      chain?.id,
      withBalances,
      ledgerAccounts,
      selectedAccounts,
      walletAccounts,
    ],
  )

  useEffect(() => {
    // refresh on every page change
    loadPage(pageIndex)
  }, [loadPage, pageIndex])

  return {
    accounts,
    connectionStatus,
    withBalances,
    chain,
  }
}
