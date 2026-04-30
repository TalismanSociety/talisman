import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import { isAccountOwned } from "@core/domains/keyring/exports"
import type { DotNetwork } from "@talismn/chaindata-provider"
import { decodeSs58Address, isAddressEqual, isAddressValid, isSs58Address } from "@talismn/crypto"
import { EyeIcon, TalismanHandIcon, UserIcon } from "@talismn/icons"
import { Modal } from "@ui/components/Modal"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInput } from "@ui/components/SearchInput"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { useOpenCloseStatus } from "@ui/hooks/useOpenCloseStatus"
import { useAccounts } from "@ui/state/accounts"
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { SendFundsAccountsList } from "../../SendFunds/SendFundsAccountsList"

type DelegatePickerProps = {
  isOpen: boolean
  containerId: string
  address: string
  network: DotNetwork | undefined
  selectedDelegate: string
  onSelect: (address: string) => void
  onDismiss: () => void
}

export const DelegatePicker: FC<DelegatePickerProps> = ({
  isOpen,
  containerId,
  address,
  network,
  selectedDelegate,
  onSelect,
  onDismiss,
}) => {
  return (
    <Modal containerId={containerId} isOpen={isOpen} onDismiss={onDismiss}>
      <DelegatePickerContent
        address={address}
        network={network}
        selectedDelegate={selectedDelegate}
        onSelect={onSelect}
        onDismiss={onDismiss}
      />
    </Modal>
  )
}

const DelegatePickerContent: FC<{
  address: string
  network: DotNetwork | undefined
  selectedDelegate: string
  onSelect: (address: string) => void
  onDismiss: () => void
}> = ({ address, network, selectedDelegate, onSelect, onDismiss }) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const refSearchInput = useRef<HTMLInputElement>(null)
  const status = useOpenCloseStatus()
  useEffect(() => {
    if (status === "open") refSearchInput.current?.focus()
  }, [status])

  const allAccounts = useAccounts("all")

  const compatibleAccounts = useMemo(() => {
    if (!network) return []
    return allAccounts.filter(
      (account) =>
        isAccountCompatibleWithNetwork(network, account) &&
        !isAddressEqual(account.address, address)
    )
  }, [allAccounts, address, network])

  const matchingAccounts = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase()
    if (!lowerSearch) return compatibleAccounts
    return compatibleAccounts.filter(
      (account) =>
        account.name?.toLowerCase().includes(lowerSearch) ||
        account.address.toLowerCase().includes(lowerSearch)
    )
  }, [compatibleAccounts, search])

  const [ownedAccounts, watchedAccounts, contacts] = useMemo(
    () => [
      matchingAccounts.filter(isAccountOwned),
      matchingAccounts.filter((a) => a.type === "watch-only"),
      matchingAccounts.filter((a) => a.type === "contact"),
    ],
    [matchingAccounts]
  )

  const newAddress = useMemo<{ address: string } | null>(() => {
    if (!search || !network || matchingAccounts.length) return null

    if (isAddressValid(search)) {
      if (isSs58Address(search)) {
        const [, ss58Format] = decodeSs58Address(search)
        if (![42, network.prefix, network.oldPrefix].includes(ss58Format)) return null
      }
      if (isAddressEqual(search, address)) return null
      return { address: search }
    }
    return null
  }, [address, matchingAccounts.length, network, search])

  const handleSelect = useCallback(
    (selectedAddress: string) => {
      onSelect(selectedAddress)
      onDismiss()
    },
    [onDismiss, onSelect]
  )

  const handleSubmitSearch = useCallback(() => {
    if (newAddress) handleSelect(newAddress.address)
  }, [handleSelect, newAddress])

  return (
    <WizardModalDialog
      className="border-none"
      contentClassName="p-0!"
      title={t("Select Delegate")}
      onBackClick={onDismiss}
    >
      <div className="flex size-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <SearchInput
            ref={refSearchInput}
            onChange={setSearch}
            onSubmit={handleSubmitSearch}
            placeholder={t("Search or enter address")}
          />
        </div>
        <ScrollContainer className="scrollable grow border-grey-700 border-t bg-black-secondary">
          {newAddress && (
            <SendFundsAccountsList
              allowZeroBalance
              accounts={[newAddress]}
              noFormat
              selected={selectedDelegate}
              onSelect={handleSelect}
            />
          )}
          <SendFundsAccountsList
            allowZeroBalance
            accounts={contacts}
            selected={selectedDelegate}
            onSelect={handleSelect}
            header={
              <>
                <UserIcon className="mr-2 inline align-text-top" />
                <span>{t("Contacts")}</span>
              </>
            }
          />
          <SendFundsAccountsList
            allowZeroBalance
            accounts={ownedAccounts}
            selected={selectedDelegate}
            onSelect={handleSelect}
            header={
              <>
                <TalismanHandIcon className="mr-2 inline-block align-text-top" />
                {t("My Accounts")}
              </>
            }
          />
          <SendFundsAccountsList
            allowZeroBalance
            accounts={watchedAccounts}
            selected={selectedDelegate}
            onSelect={handleSelect}
            header={
              <>
                <EyeIcon className="mr-2 inline-block align-text-top" />
                {t("Followed only")}
              </>
            }
          />
        </ScrollContainer>
      </div>
    </WizardModalDialog>
  )
}
