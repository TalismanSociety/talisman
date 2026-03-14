import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import type { Account } from "@core/domains/keyring/exports"
import { isValidAddress } from "@ethereumjs/util"
import { getNetworkGenesisHash, type Network } from "@talismn/chaindata-provider"
import { detectAddressEncoding, isAddressEqual, normalizeAddress } from "@talismn/crypto"
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

type Props = {
  title: string
  subtitle: string
  allowInput?: boolean
  allowZeroBalance?: boolean
  tokenId: string | null
  onAccountChange?: (address: string | null) => void
  value?: string | null
  compact?: boolean
}

export const SwapAccountPicker = memo(
  ({
    title,
    subtitle,
    tokenId,
    allowInput = false,
    allowZeroBalance = false,
    onAccountChange,
    value,
    compact = false,
  }: Props) => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)

    const allAccounts = useAccounts(allowInput ? "all" : "owned")

    const token = useToken(tokenId ?? undefined)
    const network = useNetworkById(token?.networkId)

    const [query, setQuery] = useState("")
    const deferredQuery = useDeferredValue(query)

    const compatibleAccounts = useMemo(
      () =>
        allAccounts.filter(
          (account) => network && isAccountCompatibleWithNetwork(network, account)
        ),
      [allAccounts, network]
    )

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

    const filteredAccounts = useMemo(() => {
      const lowerQuery = deferredQuery.trim().toLowerCase()

      let results = !lowerQuery
        ? compatibleAccounts
        : compatibleAccounts.filter(
            (account) =>
              account.name?.toLowerCase().includes(lowerQuery) ||
              account.address.toLowerCase().includes(lowerQuery)
          )

      // Prepend manually entered address if it doesn't match an existing account
      if (
        accountFromInput &&
        !results.some((a) => a.address.toLowerCase() === accountFromInput.address.toLowerCase())
      ) {
        results = [accountFromInput, ...results]
      }

      return results
    }, [compatibleAccounts, deferredQuery, accountFromInput])

    const selectedAccount = useMemo(() => {
      if (value === null || value === undefined) return
      return compatibleAccounts.find((account) => isAddressEqual(account.address, value))
    }, [compatibleAccounts, value])

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
            <div className="truncate">
              {selectedAccount.name ?? shortenAddress(selectedAccount.address)}
            </div>
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
          <AccountPickerDialog
            title={title}
            subtitle={subtitle}
            accounts={filteredAccounts}
            selectedAccount={selectedAccount}
            query={query}
            setQuery={setQuery}
            allowInput={allowInput}
            allowZeroBalance={allowZeroBalance}
            onAccountChange={onSelectAccount}
            onClose={() => setOpen(false)}
            tokenId={tokenId}
            network={network}
          />
        </Modal>
      </>
    )
  }
)

const AccountPickerDialog = memo(
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
    tokenId,
    network,
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
    tokenId: string | null
    network: Network | null
  }) => {
    const { t } = useTranslation()

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
            genesisHash={getNetworkGenesisHash(network)}
            selected={selectedAccount?.address}
            onSelect={onAccountChange}
            tokenId={tokenId ?? undefined}
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
