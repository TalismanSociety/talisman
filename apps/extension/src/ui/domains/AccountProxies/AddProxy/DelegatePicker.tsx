import {
  isAccountCompatibleWithNetwork,
  isAddressCompatibleWithNetwork,
} from "@core/domains/accounts/helpers"
import { isAccountOwned } from "@core/domains/keyring/exports"
import type { DotNetwork } from "@talismn/chaindata-provider"
import { decodeSs58Address, isAddressEqual, isAddressValid, isSs58Address } from "@talismn/crypto"
import { EyeIcon, TalismanHandIcon, UserIcon } from "@talismn/icons"
import { useAccounts } from "@ui/state/accounts"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SendFundsAccountsList } from "../../SendFunds/SendFundsAccountsList"
import { SearchablePickerLayout } from "./SearchablePickerLayout"

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
  const { t } = useTranslation()

  const handleSelect = useCallback(
    (selectedAddress: string) => {
      onSelect(selectedAddress)
      onDismiss()
    },
    [onDismiss, onSelect]
  )

  return (
    <SearchablePickerLayout
      isOpen={isOpen}
      containerId={containerId}
      title={t("Select Delegate")}
      searchPlaceholder={t("Search or enter address")}
      onDismiss={onDismiss}
    >
      {(search) => (
        <DelegateList
          address={address}
          network={network}
          search={search}
          selectedDelegate={selectedDelegate}
          onSelect={handleSelect}
        />
      )}
    </SearchablePickerLayout>
  )
}

const DelegateList: FC<{
  address: string
  network: DotNetwork | undefined
  search: string
  selectedDelegate: string
  onSelect: (address: string) => void
}> = ({ address, network, search, selectedDelegate, onSelect }) => {
  const { t } = useTranslation()
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

    if (isAddressValid(search) && isAddressCompatibleWithNetwork(network, search)) {
      if (isSs58Address(search)) {
        const [, ss58Format] = decodeSs58Address(search)
        if (![42, network.prefix, network.oldPrefix].includes(ss58Format)) return null
      }
      if (isAddressEqual(search, address)) return null
      return { address: search }
    }
    return null
  }, [address, matchingAccounts.length, network, search])

  return (
    <>
      {newAddress && (
        <SendFundsAccountsList
          allowZeroBalance
          accounts={[newAddress]}
          noFormat
          selected={selectedDelegate}
          onSelect={onSelect}
        />
      )}
      <SendFundsAccountsList
        allowZeroBalance
        accounts={contacts}
        selected={selectedDelegate}
        onSelect={onSelect}
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
        onSelect={onSelect}
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
        onSelect={onSelect}
        header={
          <>
            <EyeIcon className="mr-2 inline-block align-text-top" />
            {t("Followed only")}
          </>
        }
      />
    </>
  )
}
