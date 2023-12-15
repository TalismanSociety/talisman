import { DEBUG } from "@core/constants"
import { AddressesAndEvmNetwork } from "@core/domains/balances/types"
import { getEthLedgerDerivationPath } from "@core/domains/ethereum/helpers"
import { isEvmNetworkActive } from "@core/domains/ethereum/store.activeEvmNetworks"
import { LedgerEthDerivationPathType } from "@core/domains/ethereum/types"
import { convertAddress } from "@talisman/util/convertAddress"
import { LedgerAccountDefEthereum } from "@ui/domains/Account/AccountAdd/AccountAddLedger/context"
import { useLedgerEthereum } from "@ui/hooks/ledger/useLedgerEthereum"
import useAccounts from "@ui/hooks/useAccounts"
import { useActiveEvmNetworksState } from "@ui/hooks/useActiveEvmNetworksState"
import useBalancesByParams from "@ui/hooks/useBalancesByParams"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { DerivedAccountBase, DerivedAccountPickerBase } from "./DerivedAccountPickerBase"

const BALANCE_CHECK_EVM_NETWORK_IDS = ["1284", "1285", "592", "1"]

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

  const { evmNetworks } = useEvmNetworks({ activeOnly: true, includeTestnets: false })

  // which balances to fetch
  const activeEvmNetworks = useActiveEvmNetworksState()
  const addressesAndEvmNetworks = useMemo(() => {
    // start fetching balances only when all accounts are known to prevent recreating subscription 5 times
    if (derivedAccounts.filter(Boolean).length < derivedAccounts.length) return undefined

    const result: AddressesAndEvmNetwork = {
      addresses: derivedAccounts
        .filter((acc) => !!acc)
        .map((acc) => acc?.address)
        .filter(Boolean) as string[],
      evmNetworks: (evmNetworks || [])
        .filter((chain) => BALANCE_CHECK_EVM_NETWORK_IDS.includes(chain.id))
        .filter((chain) => isEvmNetworkActive(chain, activeEvmNetworks))
        .map(({ id, nativeToken }) => ({ id, nativeToken: { id: nativeToken?.id as string } })),
    }

    return result
  }, [derivedAccounts, activeEvmNetworks, evmNetworks])

  const withBalances = useMemo(
    () => !!addressesAndEvmNetworks?.evmNetworks.length,
    [addressesAndEvmNetworks?.evmNetworks.length]
  )

  const balances = useBalancesByParams({ addressesAndEvmNetworks })

  const accounts = useMemo(
    () =>
      derivedAccounts.map((acc) => {
        if (!acc) return null

        const existingAccount = walletAccounts?.find(
          (wa) => convertAddress(wa.address, null) === convertAddress(acc.address, null)
        )

        const accountBalances = balances.find(
          (b) => convertAddress(b.address, null) === convertAddress(acc.address, null)
        )

        return {
          ...acc,
          name: existingAccount?.name ?? acc.name,
          connected: !!existingAccount,
          selected: selectedAccounts.some((sa) => sa.path === acc.path),
          balances: accountBalances,
          isBalanceLoading:
            !addressesAndEvmNetworks ||
            accountBalances.count < BALANCE_CHECK_EVM_NETWORK_IDS.length ||
            accountBalances.each.some((b) => b.status === "cache"),
        }
      }),
    [balances, derivedAccounts, selectedAccounts, addressesAndEvmNetworks, walletAccounts]
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
