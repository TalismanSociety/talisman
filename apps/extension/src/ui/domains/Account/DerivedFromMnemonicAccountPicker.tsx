import { AccountAddressType, RequestAccountCreateFromSeed } from "@core/domains/accounts/types"
import { AddressesByEvmNetwork } from "@core/domains/balances/types"
import { getEthDerivationPath } from "@core/domains/ethereum/helpers"
import { AddressesByChain } from "@core/types/base"
import { convertAddress } from "@talisman/util/convertAddress"
import { api } from "@ui/api"
import useAccounts from "@ui/hooks/useAccounts"
import useBalancesByParams from "@ui/hooks/useBalancesByParams"
import useChains from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { DerivedAccountBase, DerivedAccountPickerBase } from "./DerivedAccountPickerBase"

const BALANCE_CHECK_EVM_NETWORK_IDS = [1284, 1285, 592, 1]
const BALANCE_CHECK_SUBSTRATE_CHAIN_IDS = ["polkadot", "kusama"]

const getDerivationPath = (type: AccountAddressType, index: number) => {
  switch (type) {
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
  type: AccountAddressType,
  selectedAccounts: RequestAccountCreateFromSeed[],
  pageIndex: number,
  itemsPerPage: number
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
          const seed = mnemonic + getDerivationPath(type, accountIndex)
          const rawAddress = await api.addressFromMnemonic(seed, type)
          const address = type === "ethereum" ? rawAddress : convertAddress(rawAddress, 0)

          return {
            accountIndex,
            name: `${name}${accountIndex === 0 ? "" : ` ${accountIndex}`}`,
            seed,
            type,
            address,
          } as DerivedFromMnemonicAccount
        })
      )

      setDerivedAccounts(newAccounts)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [itemsPerPage, mnemonic, name, pageIndex, type])

  const chains = useChains()
  const evmNetworks = useEvmNetworks()

  const { chainIds, addressesByChain, addressesByEvmNetwork } = useMemo(() => {
    const chainIds = type === "ethereum" ? [] : BALANCE_CHECK_SUBSTRATE_CHAIN_IDS
    const evmNetworkIds = type === "ethereum" ? BALANCE_CHECK_EVM_NETWORK_IDS : []
    const testChains = (chains || []).filter((chain) => chainIds.includes(chain.id))

    const addressesByChain =
      type === "ethereum"
        ? {}
        : testChains.reduce(
            (prev, curr) => ({
              ...prev,
              [curr.id]: derivedAccounts
                .filter((acc) => !!acc)
                .map((acc) => acc as DerivedFromMnemonicAccount)
                .map((account) => convertAddress(account.address, curr.prefix)),
            }),
            {} as AddressesByChain
          )

    const addressesByEvmNetwork: AddressesByEvmNetwork =
      type === "ethereum"
        ? {
            addresses: derivedAccounts
              .filter((acc) => !!acc)
              .map((acc) => acc?.address)
              .filter(Boolean) as string[],
            evmNetworks: (evmNetworks || [])
              .filter((chain) => evmNetworkIds.includes(Number(chain.id)))
              .map(({ id, nativeToken }) => ({
                id,
                nativeToken: { id: nativeToken?.id as string },
              })),
          }
        : { addresses: [], evmNetworks: [] }

    return { chainIds, addressesByChain, addressesByEvmNetwork }
  }, [chains, derivedAccounts, evmNetworks, type])

  const balances = useBalancesByParams(addressesByChain, addressesByEvmNetwork)

  const accounts: (DerivedFromMnemonicAccount | null)[] = useMemo(
    () =>
      derivedAccounts.map((acc) => {
        if (!acc) return null

        const existingAccount = walletAccounts?.find(
          (wa) =>
            convertAddress(wa.address, null) === convertAddress(acc.address, null) &&
            acc.genesisHash === wa.genesisHash
        )

        const accountBalances = balances.sorted.filter(
          (b) => convertAddress(b.address, null) === convertAddress(acc.address, null)
        )

        return {
          ...acc,
          name: existingAccount?.name ?? acc.name,
          connected: !!existingAccount,
          selected: selectedAccounts.some((sa) => sa.seed === acc.seed),
          balances: accountBalances,
          isBalanceLoading:
            accountBalances.length < chainIds.length ||
            accountBalances.some((b) => b.status !== "live"),
        }
      }),
    [balances.sorted, chainIds.length, derivedAccounts, selectedAccounts, walletAccounts]
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

type DerivedAccountPickerProps = {
  name: string
  mnemonic: string
  type: AccountAddressType
  onChange?: (accounts: RequestAccountCreateFromSeed[]) => void
}

type DerivedFromMnemonicAccount = DerivedAccountBase & RequestAccountCreateFromSeed

export const DerivedFromMnemonicAccountPicker: FC<DerivedAccountPickerProps> = ({
  name,
  mnemonic,
  type,
  onChange,
}) => {
  const itemsPerPage = 5
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedAccounts, setSelectedAccounts] = useState<RequestAccountCreateFromSeed[]>([])
  const { accounts, error } = useDerivedAccounts(
    name,
    mnemonic,
    type,
    selectedAccounts,
    pageIndex,
    itemsPerPage
  )

  const handleToggleAccount = useCallback((acc: DerivedAccountBase) => {
    const { name, seed, type } = acc as DerivedFromMnemonicAccount
    setSelectedAccounts((prev) =>
      prev.some((pa) => pa.seed === seed)
        ? prev.filter((pa) => pa.seed !== seed)
        : prev.concat({
            name,
            seed,
            type,
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
