import { isValidAddress } from "@ethereumjs/util"
import {
  detectAddressEncoding,
  encodeAnyAddress,
  isAddressEqual,
  isBitcoinAddress,
  normalizeAddress,
} from "@talismn/crypto"
import { ChevronLeftIcon } from "@talismn/icons"
import {
  Account,
  isAccountAddressEthereum,
  isAccountAddressSs58,
  isAccountBitcoin,
  isAccountCompatibleWithNetwork,
  isAccountPlatformEthereum,
} from "extension-core"
import { useAtomValue } from "jotai"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { SendFundsAccountsList } from "@ui/domains/SendFunds/SendFundsAccountsList"
import { useAccounts, useNetworkById, useToken } from "@ui/state"

import {
  fromAssetAtom,
  SwappableAssetWithDecimals,
  toAssetAtom,
} from "../swap-modules/common.swap-module"
import { SwapTokensFullscreenPortal } from "./SwapTokensFullscreenPortal"

type Props = {
  title: string
  subtitle: string
  allowInput?: boolean
  allowZeroBalance?: boolean
  asset: SwappableAssetWithDecimals | null
  accountsType?: "substrate" | "ethereum" | "btc" | "all"
  onAccountChange?: (address: string | null) => void
  evmAccountsFilter?: (account: Account) => boolean
  substrateAccountsFilter?: (account: Account) => boolean
  substrateAccountPrefix?: number
  disableBtc?: boolean
  value?: string | null
}

export const SeparatedAccountSelector = ({
  title,
  subtitle,
  asset,
  accountsType = "substrate",
  allowInput = false,
  allowZeroBalance = false,
  onAccountChange,
  evmAccountsFilter,
  substrateAccountsFilter,
  substrateAccountPrefix,
  value,
  disableBtc = false,
}: Props) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const allAccounts = useAccounts(allowInput ? "all" : "owned")

  const chain = useNetworkById(String(asset?.chainId), "polkadot")

  const defaultSubstrateAccounts = allAccounts.filter(
    (a) => chain && isAccountCompatibleWithNetwork(chain, a),
  )
  const defaultEvmAccounts = allAccounts.filter((a) => isAccountPlatformEthereum(a))

  const [query, setQuery] = useState("")

  const accountFromInput = useMemo((): Account | null => {
    if (!allowInput) return null
    if (!query) return null

    const accountCommon = {
      type: "watch-only" as const,
      isPortfolio: false,
      createdAt: 0,
    }

    if (isValidAddress(query)) {
      const encoding = detectAddressEncoding(query)
      switch (encoding) {
        case "ss58": {
          const address = normalizeAddress(query)
          return { ...accountCommon, name: shortenAddress(address), address }
        }
        default:
          return { ...accountCommon, name: shortenAddress(query), address: query }
      }
    }
    return null
  }, [allowInput, query])

  const evmAccounts = useMemo(() => {
    const filtered = evmAccountsFilter
      ? defaultEvmAccounts.filter(evmAccountsFilter)
      : defaultEvmAccounts
    if (
      !accountFromInput ||
      !isAccountAddressEthereum(accountFromInput) ||
      filtered.find((a) => a.address.toLowerCase() === accountFromInput?.address.toLowerCase())
    )
      return filtered
    return [accountFromInput, ...filtered]
  }, [accountFromInput, defaultEvmAccounts, evmAccountsFilter])

  const substrateAccounts = useMemo(() => {
    const filtered = substrateAccountsFilter
      ? defaultSubstrateAccounts.filter(substrateAccountsFilter)
      : defaultSubstrateAccounts
    if (
      !accountFromInput ||
      !isAccountAddressSs58(accountFromInput) ||
      filtered.find((a) => a.address.toLowerCase() === accountFromInput.address.toLowerCase())
    )
      return filtered
    return [accountFromInput, ...filtered]
  }, [accountFromInput, substrateAccountsFilter, defaultSubstrateAccounts])

  const queriedEvmAccounts = useMemo(() => {
    if (query.trim() === "") return evmAccounts
    return evmAccounts.filter(
      (account) =>
        account.address?.toLowerCase().includes(query.toLowerCase()) ||
        account.name?.toLowerCase().includes(query.toLowerCase()),
    )
  }, [query, evmAccounts])

  const queriedSubstrateAccounts = useMemo(() => {
    if (query.trim() === "") return substrateAccounts
    return substrateAccounts.filter(
      (account) =>
        account.address?.toLowerCase().includes(query.toLowerCase()) ||
        encodeAnyAddress(account.address, { ss58Format: substrateAccountPrefix })
          .toLowerCase()
          .includes(query.toLowerCase()) ||
        account.name?.toLowerCase().includes(query.toLowerCase()),
    )
  }, [query, substrateAccountPrefix, substrateAccounts])

  const btcAccounts = useMemo(() => {
    if (isAccountBitcoin(accountFromInput)) return [accountFromInput]
    return []
  }, [accountFromInput])

  const selectedAccount = useMemo(() => {
    if (value === null || value === undefined) return

    const accounts = (() => {
      switch (accountsType) {
        case "all":
          return [...evmAccounts, ...substrateAccounts]
        case "ethereum":
          return evmAccounts
        case "substrate":
          return substrateAccounts
        case "btc":
          return btcAccounts
        default:
          return []
      }
    })()

    return accounts.find((account) => isAddressEqual(account.address, value))
  }, [accountsType, evmAccounts, substrateAccounts, btcAccounts, value])

  const onSelectAccount = useCallback(
    (address: string | null) => {
      setOpen(false)
      onAccountChange?.(address)
    },
    [onAccountChange],
  )

  // selected account is invalid, clear it
  useEffect(() => {
    if (!selectedAccount && value) {
      onAccountChange?.(null)
      setQuery("")
    }
  }, [onAccountChange, selectedAccount, value])

  const accounts: Account[] = useMemo(() => {
    if (accountsType === "all") return [...queriedEvmAccounts, ...queriedSubstrateAccounts]
    if (accountsType === "ethereum")
      return accountFromInput ? [accountFromInput] : queriedEvmAccounts
    if (accountsType === "substrate")
      return accountFromInput ? [accountFromInput] : queriedSubstrateAccounts
    if (accountsType === "btc") return accountFromInput ? [accountFromInput] : btcAccounts
    return []
  }, [accountFromInput, accountsType, btcAccounts, queriedEvmAccounts, queriedSubstrateAccounts])

  if (accountsType === "btc" && disableBtc)
    return (
      <div className="rounded p-6 [&>p]:text-sm">
        <p className="text-center">{t("BTC accounts not supported.")}</p>
      </div>
    )

  return (
    <>
      <button
        className="allow-focus bg-black-tertiary hover:bg-grey-700 disabled:bg-black-tertiary overflow-x-hidden rounded px-4 py-2 text-white outline-offset-0 focus-visible:outline-current disabled:opacity-50"
        onClick={() => setOpen(true)}
      >
        {selectedAccount && (
          <div className="flex shrink-0 items-center gap-4">
            <AccountIcon className="text-lg" address={selectedAccount.address} />
            <AccountRow
              substrateAccountPrefix={substrateAccountPrefix}
              address={selectedAccount.address}
              name={selectedAccount.name}
            />
          </div>
        )}
        {!selectedAccount && (
          <div className="flex shrink-0 items-center gap-4">
            <div className="bg-body-inactive h-12 w-12 rounded-full"></div>
            <div>{t("Select account")}</div>
          </div>
        )}
      </button>

      {open && (
        <SwapTokensFullscreenPortal>
          <div className="absolute left-0 top-0 h-full w-full bg-black">
            <AccountPicker
              title={title}
              subtitle={subtitle}
              accounts={accounts}
              selectedAccount={selectedAccount}
              query={query}
              setQuery={setQuery}
              allowInput={allowInput}
              allowZeroBalance={allowZeroBalance}
              onAccountChange={onSelectAccount}
              onClose={() => setOpen(false)}
            />
          </div>
        </SwapTokensFullscreenPortal>
      )}
    </>
  )
}

const AccountPicker = ({
  title,
  subtitle,
  accounts,
  selectedAccount,
  query,
  setQuery,
  allowInput,
  allowZeroBalance,
  onAccountChange,
  onClose,
}: {
  title: string
  subtitle: string
  accounts: Account[]
  selectedAccount?: Account
  query?: string
  setQuery?: (query: string) => void
  allowInput?: boolean
  allowZeroBalance?: boolean
  onAccountChange?: (address: string | null) => void
  onClose: () => void
}) => {
  const { t } = useTranslation()

  const fromAsset = useAtomValue(fromAssetAtom)
  const toAsset = useAtomValue(toAssetAtom)

  const fromToken = useToken(fromAsset?.id)
  const fromChain = useNetworkById(fromToken?.networkId, "polkadot")

  const toToken = useToken(toAsset?.id)
  const toChain = useNetworkById(toToken?.networkId, "polkadot")

  return (
    <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <button className="px-12 py-10" onClick={onClose}>
            <ChevronLeftIcon className="text-body-secondary shrink-0 text-lg hover:text-white" />
          </button>
        </div>

        <h3 className="text-body-secondary text-base">{title}</h3>

        <div className="flex-1" />
      </div>
      <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
        <div className="font-bold">{subtitle}</div>
        <div className="mx-1 grow overflow-hidden px-1">
          <SearchInput
            initialValue={query}
            onChange={setQuery}
            placeholder={allowInput ? t("Enter address") : t("Search by account name")}
            autoFocus // eslint-disable-line jsx-a11y/no-autofocus
          />
        </div>
      </div>
      <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
        <SendFundsAccountsList
          accounts={accounts}
          genesisHash={!allowInput ? fromChain?.genesisHash : toChain?.genesisHash}
          selected={selectedAccount?.address}
          onSelect={onAccountChange}
          tokenId={!allowInput ? fromToken?.id : toToken?.id}
          showBalances
          showIfEmpty
          allowZeroBalance={allowZeroBalance}
        />
      </ScrollContainer>
    </div>
  )
}

const AccountRow = ({
  address,
  name,
  substrateAccountPrefix,
}: {
  name?: string
  address: string
  substrateAccountPrefix?: number
}) => {
  const formattedAddress = useMemo(() => {
    if (
      address.startsWith("0x") ||
      substrateAccountPrefix === undefined ||
      isBitcoinAddress(address)
    )
      return address

    return encodeAnyAddress(address, { ss58Format: substrateAccountPrefix })
  }, [address, substrateAccountPrefix])

  return <div className="truncate">{name ?? shortenAddress(formattedAddress)}</div>
}
