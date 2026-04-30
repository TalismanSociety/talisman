import { Modal } from "@ui/components/Modal"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInput } from "@ui/components/SearchInput"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { useOpenCloseStatus } from "@ui/hooks/useOpenCloseStatus"
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import type { SendFundsAccount } from "../../SendFunds/SendFundsAccountsList"
import { SendFundsAccountsList } from "../../SendFunds/SendFundsAccountsList"

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
  return (
    <Modal containerId={containerId} isOpen={isOpen} onDismiss={onDismiss}>
      <AccountPickerContent
        accounts={accounts}
        selectedAddress={selectedAddress}
        onSelect={onSelect}
        onDismiss={onDismiss}
      />
    </Modal>
  )
}

const AccountPickerContent: FC<{
  accounts: SendFundsAccount[]
  selectedAddress: string
  onSelect: (address: string) => void
  onDismiss: () => void
}> = ({ accounts, selectedAddress, onSelect, onDismiss }) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const refSearchInput = useRef<HTMLInputElement>(null)
  const status = useOpenCloseStatus()
  useEffect(() => {
    if (status === "open") refSearchInput.current?.focus()
  }, [status])

  const matchingAccounts = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase()
    if (!lowerSearch) return accounts
    return accounts.filter(
      (account) =>
        account.name?.toLowerCase().includes(lowerSearch) ||
        account.address.toLowerCase().includes(lowerSearch)
    )
  }, [accounts, search])

  const handleSelect = useCallback(
    (address: string) => {
      onSelect(address)
      onDismiss()
    },
    [onDismiss, onSelect]
  )

  return (
    <WizardModalDialog
      className="border-none"
      contentClassName="p-0!"
      title={t("Select Account")}
      onBackClick={onDismiss}
    >
      <div className="flex size-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <SearchInput
            ref={refSearchInput}
            onChange={setSearch}
            placeholder={t("Search by name or address")}
          />
        </div>
        <ScrollContainer className="scrollable grow border-grey-700 border-t bg-black-secondary">
          <SendFundsAccountsList
            allowZeroBalance
            accounts={matchingAccounts}
            selected={selectedAddress}
            onSelect={handleSelect}
          />
        </ScrollContainer>
      </div>
    </WizardModalDialog>
  )
}
