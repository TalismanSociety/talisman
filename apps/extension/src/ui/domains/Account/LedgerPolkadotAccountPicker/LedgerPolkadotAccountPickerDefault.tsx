import { isAddressEqual } from "@talismn/crypto"
import { isNotNil } from "@talismn/util"
import { SubstrateAppParams } from "@zondax/ledger-substrate/dist/common"
import { Account, LedgerPolkadotCurve } from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { getTalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
import { useAccounts, useNetworkById, useNetworks } from "@ui/state"

import { LedgerAccountDefSubstrate } from "../AccountAdd/AccountAddLedger/context"
import { DerivedAccountBase, DerivedAccountPickerBase } from "../DerivedAccountPickerBase"
import { LedgerConnectionStatus, LedgerConnectionStatusProps } from "../LedgerConnectionStatus"
import { LedgerPolkadotAccountPickerDef, LedgerPolkadotGenericAccountPickerProps } from "./types"
import { useGetLedgerPolkadotAddress } from "./useGetLedgerPolkadotAddress"

export const LedgerPolkadotAccountPickerDefault: FC<LedgerPolkadotGenericAccountPickerProps> = ({
  onChange,
  app,
  chainId,
}) => {
  const chain = useNetworkById(chainId, "polkadot")
  const curve: LedgerPolkadotCurve = useMemo(
    () => (chain?.account === "secp256k1" ? "ethereum" : "ed25519"),
    [chain],
  )

  const itemsPerPage = 5
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedAccounts, setSelectedAccounts] = useState<LedgerAccountDefSubstrate[]>([])
  const { accounts, connectionStatus, withBalances } = useLedgerSubstrateGenericAccounts(
    selectedAccounts,
    pageIndex,
    itemsPerPage,
    curve,
    chain?.name ?? "Polkadot",
    app,
  )

  const handleToggleAccount = useCallback(
    (acc: DerivedAccountBase) => {
      const { address, name, accountIndex, addressOffset, app } =
        acc as LedgerPolkadotAccountPickerDef
      setSelectedAccounts((prev) =>
        prev.some((pa) => pa.address === address)
          ? prev.filter((pa) => pa.address !== address)
          : prev.concat({
              type: "ledger-polkadot",
              address,
              curve,
              name,
              app,
              accountIndex,
              addressOffset,
            }),
      )
    },
    [curve],
  )

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

const useLedgerSubstrateGenericAccounts = (
  selectedAccounts: LedgerAccountDefSubstrate[],
  pageIndex: number,
  itemsPerPage: number,
  curve: LedgerPolkadotCurve,
  networkName: string,
  legacyApp?: SubstrateAppParams | null,
) => {
  const walletAccounts = useAccounts()
  const { t } = useTranslation()

  const [ledgerAccounts, setLedgerAccounts] = useState<
    (LedgerPolkadotAccountPickerDef | undefined)[]
  >([...Array(itemsPerPage)])
  const refIsBusy = useRef(false)

  const { getAddress } = useGetLedgerPolkadotAddress(curve, legacyApp)

  const chains = useNetworks({ platform: "polkadot", activeOnly: true, includeTestnets: false })
  const withBalances = useMemo(() => chains.some((chain) => chain.hasCheckMetadataHash), [chains])

  const [connectionStatus, setConnectionStatus] = useState<LedgerConnectionStatusProps>({
    status: "connecting",
    message: t("Fetching account addresses..."),
  })

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
        const newAccounts: (LedgerPolkadotAccountPickerDef | undefined)[] = [...Array(itemsPerPage)]
        setLedgerAccounts([...newAccounts])

        for (let i = 0; i < itemsPerPage; i++) {
          if (refPageIndex.current !== pageIndex) return loadPage(refPageIndex.current, true)

          const accountIndex = skip + i
          const addressOffset = 0

          const address = await getAddress(accountIndex, addressOffset)
          if (refPageIndex.current !== pageIndex) return loadPage(refPageIndex.current, true)
          if (!address) throw new Error("Unable to get address")

          newAccounts[i] = {
            type: "ledger-polkadot",
            address,
            curve,
            app: legacyApp?.name ?? "Polkadot",
            accountIndex,
            addressOffset,
            name: t("Ledger {{networkName}} {{accountIndex}}", {
              networkName,
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
    [t, itemsPerPage, legacyApp, curve, networkName, getAddress],
  )

  // start fetching balances only once all accounts are loaded to prevent recreating subscription 5 times
  const balanceDefs = useMemo(
    () =>
      withBalances && ledgerAccounts.filter(isNotNil).length === itemsPerPage
        ? ledgerAccounts.filter(isNotNil).map((acc): Account => ({ ...acc, createdAt: Date.now() }))
        : [],
    [itemsPerPage, ledgerAccounts, withBalances],
  )
  const balances = useAccountImportBalances(balanceDefs)

  const accounts: (LedgerPolkadotAccountPickerDef | null)[] = useMemo(
    () =>
      ledgerAccounts.map((acc) => {
        if (!acc) return null

        const existingAccount = walletAccounts?.find((wa) =>
          isAddressEqual(wa.address, acc.address),
        )
        const accountBalances = balances.balances.find((b) =>
          isAddressEqual(b.address, acc.address),
        )

        return {
          ...acc,
          name: existingAccount?.name ?? acc.name,
          connected: !!existingAccount,
          selected: selectedAccounts.some((sa) => isAddressEqual(sa.address, acc.address)),
          balances: accountBalances,
          isBalanceLoading: withBalances && balances.status === "initialising",
        }
      }),
    [ledgerAccounts, walletAccounts, balances, selectedAccounts, withBalances],
  )

  useEffect(() => {
    // refresh on every page change
    loadPage(pageIndex)
  }, [loadPage, pageIndex])

  return {
    accounts,
    connectionStatus,
    withBalances,
  }
}
