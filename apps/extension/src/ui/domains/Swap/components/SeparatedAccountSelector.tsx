import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import type { Account } from "@core/domains/keyring/exports"
import {
  isAccountAddressEthereum,
  isAccountAddressSs58,
  isAccountBitcoin,
  isAccountPlatformEthereum,
} from "@core/domains/keyring/exports"
import { isValidAddress } from "@ethereumjs/util"
import {
  detectAddressEncoding,
  encodeAnyAddress,
  isAddressEqual,
  isBitcoinAddress,
  normalizeAddress,
} from "@talismn/crypto"
import { Modal } from "@ui/components/Modal"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInput } from "@ui/components/SearchInput"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { SendFundsAccountsList } from "@ui/domains/SendFunds/SendFundsAccountsList"
import { useAccounts } from "@ui/state/accounts"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { shortenAddress } from "@ui/util/shortenAddress"
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { useSwap } from "../SwapProvider"

type Props = {
  title: string
  subtitle: string
  allowInput?: boolean
  allowZeroBalance?: boolean
  tokenId: string | null
  accountsType?: "substrate" | "ethereum" | "btc" | "all"
  onAccountChange?: (address: string | null) => void
  evmAccountsFilter?: (account: Account) => boolean
  substrateAccountsFilter?: (account: Account) => boolean
  substrateAccountPrefix?: number
  disableBtc?: boolean
  value?: string | null
  compact?: boolean
}

export const SeparatedAccountSelector = memo(
  ({
    title,
    subtitle,
    tokenId,
    accountsType = "substrate",
    allowInput = false,
    allowZeroBalance = false,
    onAccountChange,
    evmAccountsFilter,
    substrateAccountsFilter,
    substrateAccountPrefix,
    value,
    disableBtc = false,
    compact = false,
  }: Props) => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)

    const allAccounts = useAccounts(allowInput ? "all" : "owned")

    const token = useToken(tokenId ?? undefined)
    const chain = useNetworkById(token?.networkId, "polkadot")

    const defaultSubstrateAccounts = allAccounts.filter(
      (a) => chain && isAccountCompatibleWithNetwork(chain, a)
    )
    const defaultEvmAccounts = allAccounts.filter((a) => isAccountPlatformEthereum(a))

    const [query, setQuery] = useState("")
    const deferredQuery = useDeferredValue(query)

    const accountFromInput = useMemo((): Account | null => {
      if (!allowInput) return null
      if (!deferredQuery) return null

      const accountCommon = {
        type: "watch-only" as const,
        isPortfolio: false,
        createdAt: 0,
      }

      if (isValidAddress(deferredQuery)) {
        const encoding = detectAddressEncoding(deferredQuery)
        switch (encoding) {
          case "ss58": {
            const address = normalizeAddress(deferredQuery)
            return { ...accountCommon, name: shortenAddress(address), address }
          }
          default:
            return { ...accountCommon, name: shortenAddress(deferredQuery), address: deferredQuery }
        }
      }
      return null
    }, [allowInput, deferredQuery])

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
      if (deferredQuery.trim() === "") return evmAccounts
      return evmAccounts.filter(
        (account) =>
          account.address?.toLowerCase().includes(deferredQuery.toLowerCase()) ||
          account.name?.toLowerCase().includes(deferredQuery.toLowerCase())
      )
    }, [deferredQuery, evmAccounts])

    const queriedSubstrateAccounts = useMemo(() => {
      if (deferredQuery.trim() === "") return substrateAccounts
      return substrateAccounts.filter(
        (account) =>
          account.address?.toLowerCase().includes(deferredQuery.toLowerCase()) ||
          encodeAnyAddress(account.address, { ss58Format: substrateAccountPrefix })
            .toLowerCase()
            .includes(deferredQuery.toLowerCase()) ||
          account.name?.toLowerCase().includes(deferredQuery.toLowerCase())
      )
    }, [deferredQuery, substrateAccountPrefix, substrateAccounts])

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
      [onAccountChange]
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

    const triggerButton = compact ? (
      <button
        type="button"
        className="flex h-[26px] items-center gap-3 rounded-[13px] bg-[#262626] pr-[8px] pl-[5px] transition-colors hover:bg-[#363636]"
        onClick={() => setOpen(true)}
      >
        {selectedAccount ? (
          <>
            <AccountIcon className="!text-[16px]" address={selectedAccount.address} />
            <span className="max-w-[100px] truncate text-white text-xs leading-none">
              {selectedAccount.name || shortenAddress(selectedAccount.address)}
            </span>
          </>
        ) : (
          <span className="whitespace-nowrap text-body-secondary text-xs leading-none">
            {t("Select Account")}
          </span>
        )}
      </button>
    ) : (
      <button
        type="button"
        className="allow-focus overflow-x-hidden rounded bg-black-tertiary px-4 py-2 text-white outline-offset-0 hover:bg-grey-700 focus-visible:outline-current disabled:bg-black-tertiary disabled:opacity-50"
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
            <div className="h-12 w-12 rounded-full bg-body-inactive"></div>
            <div>{t("Select account")}</div>
          </div>
        )}
      </button>
    )

    return (
      <>
        {triggerButton}

        <Modal containerId="swap-modal" isOpen={open} onDismiss={() => setOpen(false)}>
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
        </Modal>
      </>
    )
  }
)

const AccountPicker = memo(
  ({
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

    const { fromTokenId, toTokenId } = useSwap()

    const fromToken = useToken(fromTokenId ?? undefined)
    const fromChain = useNetworkById(fromToken?.networkId, "polkadot")

    const toToken = useToken(toTokenId ?? undefined)
    const toChain = useNetworkById(toToken?.networkId, "polkadot")

    return (
      <WizardModalDialog
        className="border-none"
        contentClassName="!overflow-hidden !p-0 flex flex-col"
        title={title}
        onBackClick={onClose}
      >
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <div className="font-bold">{subtitle}</div>
          <div className="mx-1 grow overflow-hidden px-1">
            <SearchInput
              initialValue={query}
              onChange={setQuery}
              placeholder={allowInput ? t("Enter address") : t("Search by account name")}
              autoFocus
            />
          </div>
        </div>
        <ScrollContainer className="scrollable h-full w-full grow overflow-x-hidden border-grey-700 border-t bg-black-secondary">
          <SendFundsAccountsList
            accounts={accounts}
            genesisHash={!allowInput ? fromChain?.genesisHash : toChain?.genesisHash}
            selected={selectedAccount?.address}
            onSelect={onAccountChange}
            tokenId={!allowInput ? fromToken?.id : toToken?.id}
            showBalances
            showIfEmpty
            allowZeroBalance={allowZeroBalance}
            virtualized
          />
        </ScrollContainer>
      </WizardModalDialog>
    )
  }
)

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
