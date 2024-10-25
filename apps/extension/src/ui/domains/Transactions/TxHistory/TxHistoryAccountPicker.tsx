import { CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { AccountJsonAny } from "extension-core"
import { FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Modal } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { AllAccountsIcon } from "@ui/domains/Account/AllAccountsIcon"
import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"

export const TxHistoryAccountPicker: FC<{
  isOpen?: boolean
  accounts: AccountJsonAny[]
  selectedAddress: string | null
  onDismiss: () => void
  onSelect: (address: string | null) => void
}> = ({ isOpen, selectedAddress, accounts: allAccounts, onDismiss, onSelect }) => {
  const { t } = useTranslation()

  const [search, setSearch] = useState("")

  const accounts = useMemo(
    () => allAccounts.filter((account) => !search || account.name?.toLowerCase().includes(search)),
    [allAccounts, search],
  )

  return (
    <Modal
      containerId="main"
      isOpen={isOpen}
      onDismiss={onDismiss}
      className="relative z-50 size-full"
    >
      <div className="flex size-full flex-grow flex-col bg-black">
        <header className="flex items-center justify-between p-10">
          <IconButton onClick={onDismiss}>
            <ChevronLeftIcon />
          </IconButton>
          <div>{"Select account"}</div>
          <IconButton onClick={onDismiss} className="invisible">
            <XIcon />
          </IconButton>
        </header>
        <div className="flex grow flex-col overflow-hidden">
          <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
            <SearchInput onChange={setSearch} placeholder={t("Search by name")} />
          </div>
          <ScrollContainer className="bg-black-secondary border-grey-700 scrollable grow border-t">
            <AccountsList
              accounts={accounts}
              selectedAddress={selectedAddress}
              showAllAccountsBtn={!search && !!accounts.length}
              onSelect={onSelect}
            />
          </ScrollContainer>
        </div>
      </div>
    </Modal>
  )
}

const AccountsList: FC<{
  accounts: AccountJsonAny[]
  selectedAddress: string | null
  showAllAccountsBtn?: boolean
  onSelect: (address: string | null) => void
}> = ({ accounts, selectedAddress, showAllAccountsBtn, onSelect }) => {
  const { t } = useTranslation()

  return (
    <div>
      {showAllAccountsBtn && (
        <AccountRow account={null} onClick={() => onSelect(null)} selected={!selectedAddress} />
      )}
      {accounts.map((account) => (
        <AccountRow
          key={account.address}
          account={account}
          selected={account.address === selectedAddress}
          onClick={() => onSelect(account.address)}
        />
      ))}
      {accounts.length === 0 && (
        <div className="text-body-secondary p-16 text-center">{t("No accounts found")}</div>
      )}
    </div>
  )
}

const AccountRow: FC<{
  account: AccountJsonAny | null
  selected?: boolean
  onClick: () => void
}> = ({ account, selected, onClick }) => {
  const { t } = useTranslation()
  const formattedAddress = useFormattedAddress(account?.address, account?.genesisHash)

  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={0}
      className={classNames(
        "hover:bg-grey-750 focus:bg-grey-700 text-body-secondary hover:text-body flex h-[5.8rem] w-full items-center gap-4 px-12 text-left",
        selected && "bg-grey-800",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      {account ? (
        <AccountIcon
          address={account.address}
          genesisHash={account.genesisHash}
          className="shrink-0 text-lg"
        />
      ) : (
        <AllAccountsIcon className="shrink-0 text-lg" />
      )}
      <div className="flex grow items-center overflow-hidden">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center gap-2">
            <div className="text-body truncate">
              {account
                ? (account.name ?? (
                    <Address
                      address={formattedAddress}
                      startCharCount={6}
                      endCharCount={6}
                      noTooltip
                    />
                  ))
                : t("All Accounts")}
            </div>
            {account && <AccountTypeIcon origin={account.origin} className="text-primary" />}
          </div>
          {account && (
            <Address className="text-body-secondary text-xs" address={formattedAddress} />
          )}
        </div>
      </div>
      <div className="shrinkk-0 flex size-12 items-center justify-center">
        {selected ? (
          <CheckCircleIcon className="text-body" />
        ) : (
          <ChevronRightIcon className="text-md" />
        )}
      </div>
    </button>
  )
}
