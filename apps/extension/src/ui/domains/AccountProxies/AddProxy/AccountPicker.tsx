import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { SendFundsAccount } from "../../SendFunds/SendFundsAccountsList"
import { SendFundsAccountsList } from "../../SendFunds/SendFundsAccountsList"
import { SearchablePickerLayout } from "./SearchablePickerLayout"

type AccountPickerProps = {
  isOpen: boolean
  containerId: string
  accounts: SendFundsAccount[]
  selectedAddress: string
  onSelect: (address: string) => void
  onDismiss: () => void
}

export const AccountPicker: FC<AccountPickerProps> = ({
  isOpen,
  containerId,
  accounts,
  selectedAddress,
  onSelect,
  onDismiss,
}) => {
  const { t } = useTranslation()

  const handleSelect = useCallback(
    (address: string) => {
      onSelect(address)
      onDismiss()
    },
    [onDismiss, onSelect]
  )

  return (
    <SearchablePickerLayout
      isOpen={isOpen}
      containerId={containerId}
      title={t("Select Account")}
      searchPlaceholder={t("Search by name or address")}
      onDismiss={onDismiss}
    >
      {(search) => (
        <AccountList
          accounts={accounts}
          search={search}
          selectedAddress={selectedAddress}
          onSelect={handleSelect}
        />
      )}
    </SearchablePickerLayout>
  )
}

const AccountList: FC<{
  accounts: SendFundsAccount[]
  search: string
  selectedAddress: string
  onSelect: (address: string) => void
}> = ({ accounts, search, selectedAddress, onSelect }) => {
  const matchingAccounts = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase()
    if (!lowerSearch) return accounts
    return accounts.filter(
      (account) =>
        account.name?.toLowerCase().includes(lowerSearch) ||
        account.address.toLowerCase().includes(lowerSearch)
    )
  }, [accounts, search])

  return (
    <SendFundsAccountsList
      allowZeroBalance
      accounts={matchingAccounts}
      selected={selectedAddress}
      onSelect={onSelect}
    />
  )
}
