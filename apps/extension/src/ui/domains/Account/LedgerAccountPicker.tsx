import { log } from "@common/log"
import { getEthLedgerDerivationPath } from "@core/domains/ethereum/helpers"
import type { LedgerEthDerivationPathType } from "@core/domains/ethereum/types"
import type { Account } from "@core/domains/keyring/exports"
import type { LedgerSolDerivationPathType } from "@core/domains/solana/exports"
import { getSolLedgerDerivationPath } from "@core/domains/solana/exports"
import { encodeAddressSolana, isAddressEqual } from "@talismn/crypto"
import { isNotNil } from "@talismn/util"
import type {
  LedgerAccountDefEthereum,
  LedgerAccountDefSolana,
} from "@ui/domains/Account/AccountAdd/AccountAddLedger/context"
import { getTalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerEthereum } from "@ui/hooks/ledger/useLedgerEthereum"
import { useLedgerSolana } from "@ui/hooks/ledger/useLedgerSolana"
import { useAccountImportBalances } from "@ui/hooks/useAccountImportBalances"
import { useAccounts } from "@ui/state/accounts"
import { useNetworks } from "@ui/state/chaindata"
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { type DerivedAccountBase, DerivedAccountPickerBase } from "./DerivedAccountPickerBase"
import { LedgerConnectionStatus, type LedgerConnectionStatusProps } from "./LedgerConnectionStatus"

type LedgerAccountDefEvmOrSol = LedgerAccountDefEthereum | LedgerAccountDefSolana

type LedgerAccountPickerConfig<TDef extends LedgerAccountDefEvmOrSol, TPathType> = {
  type: TDef["type"]
  platform: "ethereum" | "solana"
  getDerivationPath: (derivationPathType: TPathType, accountIndex: number) => string
  /** returns a hook that reads the encoded address at a derivation path */
  useGetAddress: () => (derivationPath: string) => Promise<string>
}

const ETHEREUM: LedgerAccountPickerConfig<LedgerAccountDefEthereum, LedgerEthDerivationPathType> = {
  type: "ledger-ethereum",
  platform: "ethereum",
  getDerivationPath: getEthLedgerDerivationPath,
  useGetAddress: () => {
    const { getAddress } = useLedgerEthereum()
    return useCallback(async (path: string) => (await getAddress(path)).address, [getAddress])
  },
}

const SOLANA: LedgerAccountPickerConfig<LedgerAccountDefSolana, LedgerSolDerivationPathType> = {
  type: "ledger-solana",
  platform: "solana",
  getDerivationPath: getSolLedgerDerivationPath,
  useGetAddress: () => {
    const { getAddress } = useLedgerSolana()
    return useCallback(
      async (path: string) => encodeAddressSolana((await getAddress(path)).address),
      [getAddress]
    )
  },
}

const useLedgerAccounts = <TDef extends LedgerAccountDefEvmOrSol, TPathType>(
  config: LedgerAccountPickerConfig<TDef, TPathType>,
  name: string,
  derivationPathType: TPathType,
  selectedAccounts: TDef[],
  pageIndex: number,
  itemsPerPage: number
) => {
  const { t } = useTranslation()
  const walletAccounts = useAccounts()
  const [derivedAccounts, setDerivedAccounts] = useState<(LedgerAccount<TDef> | undefined)[]>([
    ...Array(itemsPerPage),
  ])

  const refIsBusy = useRef(false)

  const getAddress = config.useGetAddress()

  const [connectionStatus, setConnectionStatus] = useState<LedgerConnectionStatusProps>({
    status: "connecting",
    message: t("Fetching account addresses..."),
  })

  // derivation path => address cache, used when going back to previous page
  const refAddressCache = useRef<Record<string, { address: string }>>({})
  useEffect(() => {
    refAddressCache.current = {} // reset if app changes
  }, [])

  const networks = useNetworks({
    platform: config.platform,
    activeOnly: true,
    includeTestnets: false,
  })
  const withBalances = useMemo(() => !!networks.length, [networks])

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
        const newAccounts: (LedgerAccount<TDef> | undefined)[] = [...Array(itemsPerPage)]
        setDerivedAccounts([...newAccounts])

        for (let i = 0; i < itemsPerPage; i++) {
          if (refPageIndex.current !== pageIndex) return loadPage(refPageIndex.current, true)

          const accountIndex = skip + i
          const path = config.getDerivationPath(derivationPathType, accountIndex)

          const { address } = refAddressCache.current[path] ?? { address: await getAddress(path) }
          if (refPageIndex.current !== pageIndex) return loadPage(refPageIndex.current, true)
          if (!address) throw new Error("Unable to get address")
          refAddressCache.current[path] = { address }

          newAccounts[i] = {
            type: config.type,
            derivationPath: path,
            accountIndex,
            name: `${name.trim()} ${accountIndex + 1}`,
            address,
          } as unknown as LedgerAccount<TDef>

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
    [config, derivationPathType, getAddress, itemsPerPage, name, t]
  )

  // start fetching balances only once all accounts are loaded to prevent recreating subscription 5 times
  const balanceDefs = useMemo(
    () =>
      withBalances && derivedAccounts.filter(isNotNil).length === itemsPerPage
        ? derivedAccounts.filter(isNotNil).map(
            ({ address }) =>
              ({
                type: config.type,
                address,
                name: "",
                createdAt: Date.now(),
                derivationPath: "",
              }) as Account
          )
        : [],
    [config, derivedAccounts, itemsPerPage, withBalances]
  )
  const balances = useAccountImportBalances(balanceDefs)

  const accounts = useMemo(
    () =>
      derivedAccounts.map((acc) => {
        if (!acc) return null

        const existingAccount = walletAccounts?.find((wa) =>
          isAddressEqual(wa.address, acc.address)
        )

        const accountBalances = balances.balances.find((b) =>
          isAddressEqual(b.address, acc.address)
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
    [balances, derivedAccounts, selectedAccounts, walletAccounts, withBalances]
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

type LedgerAccount<TDef extends LedgerAccountDefEvmOrSol> = DerivedAccountBase & TDef

type LedgerAccountPickerProps<TDef extends LedgerAccountDefEvmOrSol, TPathType> = {
  name: string
  derivationPathType: TPathType
  onChange?: (accounts: TDef[]) => void
}

const LedgerAccountPicker = <TDef extends LedgerAccountDefEvmOrSol, TPathType>({
  config,
  name,
  derivationPathType,
  onChange,
}: LedgerAccountPickerProps<TDef, TPathType> & {
  config: LedgerAccountPickerConfig<TDef, TPathType>
}) => {
  const itemsPerPage = 5
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedAccounts, setSelectedAccounts] = useState<TDef[]>([])
  const { accounts, withBalances, connectionStatus } = useLedgerAccounts(
    config,
    name,
    derivationPathType,
    selectedAccounts,
    pageIndex,
    itemsPerPage
  )

  const handleToggleAccount = useCallback(
    (acc: DerivedAccountBase) => {
      const { name, address, derivationPath } = acc as LedgerAccount<TDef>
      setSelectedAccounts((prev) =>
        prev.some((pa) => pa.derivationPath === derivationPath)
          ? prev.filter((pa) => pa.derivationPath !== derivationPath)
          : prev.concat({ type: config.type, name, address, derivationPath } as TDef)
      )
    },
    [config.type]
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
        canPageBack={pageIndex > 0}
        onAccountClick={handleToggleAccount}
        onPagerFirstClick={handlePageFirst}
        onPagerPrevClick={handlePagePrev}
        onPagerNextClick={handlePageNext}
      />
    </>
  )
}

export const LedgerEthereumAccountPicker: FC<
  LedgerAccountPickerProps<LedgerAccountDefEthereum, LedgerEthDerivationPathType>
> = (props) => <LedgerAccountPicker config={ETHEREUM} {...props} />

export const LedgerSolanaAccountPicker: FC<
  LedgerAccountPickerProps<LedgerAccountDefSolana, LedgerSolDerivationPathType>
> = (props) => <LedgerAccountPicker config={SOLANA} {...props} />
