import { AccountAddressType } from "@core/domains/accounts/types"
import { AddressesByEvmNetwork } from "@core/domains/balances/types"
import {
  getEthLedgerDerivationPath,
  LedgerEthDerivationPathType,
} from "@core/domains/ethereum/helpers"
import { convertAddress } from "@talisman/util/convertAddress"
import { LedgerAccountDefEthereum } from "@ui/apps/dashboard/routes/AccountAddLedger/context"
import useAccounts from "@ui/hooks/useAccounts"
import useBalancesByParams from "@ui/hooks/useBalancesByParams"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useLedgerEthereum } from "@ui/hooks/useLedgerEthereum"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { DerivedAccountBase, DerivedAccountPickerBase } from "./DerivedAccountPickerBase"

const BALANCE_CHECK_EVM_NETWORK_IDS = [1284, 1285, 592, 1]

const useLedgerEthereumAccounts = (
  name: string,
  derivationPathType: LedgerEthDerivationPathType,
  selectedAccounts: LedgerAccountDefEthereum[],
  pageIndex: number,
  itemsPerPage: number
) => {
  const walletAccounts = useAccounts()
  const [derivedAccounts, setDerivedAccounts] = useState<(LedgerEthereumAccount | undefined)[]>([
    ...Array(itemsPerPage),
  ])
  const [error, setError] = useState<string>()

  const { isReady, ledger } = useLedgerEthereum()

  const loadPage = useCallback(async () => {
    if (!ledger || !isReady) return

    setError(undefined)

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

        setDerivedAccounts((prev) => [...newAccounts])
      }
    } catch (err) {
      setError((err as Error).message)
    }
  }, [derivationPathType, isReady, itemsPerPage, ledger, name, pageIndex])

  const evmNetworks = useEvmNetworks()

  const balanceParams: AddressesByEvmNetwork = useMemo(() => {
    const evmNetworkIds = [1284, 1285, 592, 1]

    const result = {
      addresses: derivedAccounts
        .filter((acc) => !!acc)
        .map((acc) => acc?.address)
        .filter(Boolean) as string[],
      evmNetworks: (evmNetworks || [])
        .filter((chain) => evmNetworkIds.includes(Number(chain.id)))
        .map(({ id, nativeToken }) => ({ id, nativeToken: { id: nativeToken?.id as string } })),
    }

    return result
  }, [derivedAccounts, evmNetworks])

  const balances = useBalancesByParams({}, balanceParams)

  const accounts = useMemo(
    () =>
      derivedAccounts.map((acc) => {
        if (!acc) return null

        const existingAccount = walletAccounts?.find(
          (wa) => convertAddress(wa.address, null) === convertAddress(acc.address, null)
        )

        const accountBalances = balances.sorted.filter(
          (b) => convertAddress(b.address, null) === convertAddress(acc.address, null)
        )

        return {
          ...acc,
          name: existingAccount?.name ?? acc.name,
          connected: !!existingAccount,
          selected: selectedAccounts.some((sa) => sa.path === acc.path),
          balances: accountBalances,
          isBalanceLoading:
            accountBalances.length < BALANCE_CHECK_EVM_NETWORK_IDS.length ||
            accountBalances.some((b) => b.status !== "live"),
        }
      }),
    [balances.sorted, derivedAccounts, selectedAccounts, walletAccounts]
  )

  useEffect(() => {
    // refresh on every page change
    loadPage()
  }, [loadPage])

  return {
    accounts,
    error,
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
  const { accounts, error } = useLedgerEthereumAccounts(
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
        onAccountClick={handleToggleAccount}
        onPagerFirstClick={handlePageFirst}
        onPagerPrevClick={handlePagePrev}
        onPagerNextClick={handlePageNext}
      />
      <p className="text-alert-error">{error}</p>
    </>
  )
}
