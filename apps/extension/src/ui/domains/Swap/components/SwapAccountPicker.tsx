import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import type { Account } from "@core/domains/keyring/exports"
import { getNetworkGenesisHash, isNetworkEth, type Network } from "@talismn/chaindata-provider"
import {
  detectAddressEncoding,
  isAddressEqual,
  isAddressValid,
  normalizeAddress,
} from "@talismn/crypto"
import { LoaderIcon } from "@talismn/icons"
import { Modal } from "@ui/components/Modal"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInput } from "@ui/components/SearchInput"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { SendFundsAccountsList } from "@ui/domains/SendFunds/SendFundsAccountsList"
import { useResolveNsName } from "@ui/hooks/useResolveNsName"
import { useAccounts } from "@ui/state/accounts"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { shortenAddress } from "@ui/util/shortenAddress"
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

type Props = {
  title: string
  subtitle: string
  allowInput?: boolean
  allowZeroBalance?: boolean
  tokenId: string | null
  onAccountChange?: (address: string | null) => void
  value?: string | null
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
  }: Props) => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)

    const allAccounts = useAccounts(allowInput ? "all" : "owned")

    const token = useToken(tokenId ?? undefined)
    const network = useNetworkById(token?.networkId)
    const prevNetworkRef = useRef(network)

    const [query, setQuery] = useState("")
    const deferredQuery = useDeferredValue(query)

    const [nsLookup, { isNsLookup, isNsFetching }] = useResolveNsName(
      allowInput ? deferredQuery : undefined,
      { ens: isNetworkEth(network) }
    )

    const compatibleAccounts = useMemo(
      () =>
        allAccounts.filter(
          (account) => network && isAccountCompatibleWithNetwork(network, account)
        ),
      [allAccounts, network]
    )

    const accountFromInput = useMemo((): Account | null => {
      if (!allowInput || !deferredQuery) return null

      const accountCommon = {
        type: "contact" as const,
        isPortfolio: false,
        createdAt: 0,
      }

      if (isAddressValid(deferredQuery)) {
        const encoding = detectAddressEncoding(deferredQuery)
        if (!encoding) return null

        if (encoding === "ss58") {
          const address = normalizeAddress(deferredQuery)
          return { ...accountCommon, name: shortenAddress(address), address }
        }

        return { ...accountCommon, name: shortenAddress(deferredQuery), address: deferredQuery }
      }

      if (isNsLookup && nsLookup && isAddressValid(nsLookup)) {
        return { ...accountCommon, name: deferredQuery, address: nsLookup }
      }

      return null
    }, [allowInput, deferredQuery, isNsLookup, nsLookup])

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

    // Clear address only when a network change makes it incompatible,
    // not just because the address isn't in the accounts store (external addresses).
    useEffect(() => {
      const networkChanged = prevNetworkRef.current !== network
      prevNetworkRef.current = network

      if (networkChanged && !selectedAccount && value) {
        onAccountChange?.(null)
        setQuery("")
      }
    }, [onAccountChange, selectedAccount, value, network])

    return (
      <>
        <button
          type="button"
          className="flex h-[26px] items-center gap-3 rounded-[13px] bg-[#262626] pr-[8px] pl-[5px] transition-colors enabled:hover:bg-[#363636] disabled:opacity-80"
          onClick={() => setOpen(true)}
          disabled={!token}
        >
          {selectedAccount || value ? (
            <>
              <AccountIcon
                className="!text-[16px]"
                address={selectedAccount?.address || value || ""}
              />
              <span className="max-w-[100px] truncate text-white text-xs leading-none">
                {selectedAccount?.name || <Address address={value || ""} />}
              </span>
            </>
          ) : (
            <span className="whitespace-nowrap px-3 pr-2 text-body-secondary text-xs leading-none">
              {t("Select Account")}
            </span>
          )}
        </button>

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
            isNsLookup={isNsLookup}
            isNsFetching={isNsFetching}
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
    isNsLookup,
    isNsFetching,
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
    isNsLookup?: boolean
    isNsFetching?: boolean
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
              after={
                isNsLookup && isNsFetching ? (
                  <LoaderIcon className="shrink-0 animate-spin-slow text-body-disabled" />
                ) : null
              }
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
