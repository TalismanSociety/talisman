import type { Account } from "@core/domains/keyring/exports"
import { getAccountGenesisHash } from "@core/domains/keyring/exports"
import { CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "@talismn/icons"
import { IconButton } from "@ui/components/IconButton"
import { Modal } from "@ui/components/Modal"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInput } from "@ui/components/SearchInput"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { AllAccountsIcon } from "@ui/domains/Account/AllAccountsIcon"
import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"
import { classNames } from "@ui/util/cn"
import { type FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

export const TxHistoryAccountPicker: FC<{
  isOpen?: boolean
  accounts: Account[]
  selectedAddress: string | null
  onDismiss: () => void
  onSelect: (address: string | null) => void
}> = ({ isOpen, selectedAddress, accounts: allAccounts, onDismiss, onSelect }) => {
  const { t } = useTranslation()

  const [search, setSearch] = useState("")

  const accounts = useMemo(
    () => allAccounts.filter((account) => !search || account.name?.toLowerCase().includes(search)),
    [allAccounts, search]
  )

  return (
    <Modal
      containerId="main"
      isOpen={isOpen}
      onDismiss={onDismiss}
      className="relative z-50 size-full"
    >
      <div className="flex size-full grow flex-col bg-black">
        <header className="flex items-center justify-between p-10">
          <IconButton onClick={onDismiss}>
            <ChevronLeftIcon />
          </IconButton>
          <div>{t("Select account")}</div>
          <IconButton onClick={onDismiss} className="invisible">
            <XIcon />
          </IconButton>
        </header>
        <div className="flex grow flex-col overflow-hidden">
          <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
            <SearchInput onChange={setSearch} placeholder={t("Search by name")} />
          </div>
          <ScrollContainer className="scrollable grow border-grey-700 border-t bg-black-secondary">
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
  accounts: Account[]
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
        <div className="p-16 text-center text-body-secondary">{t("No accounts found")}</div>
      )}
    </div>
  )
}

const AccountRow: FC<{
  account: Account | null
  selected?: boolean
  onClick: () => void
}> = ({ account, selected, onClick }) => {
  const { t } = useTranslation()
  const formattedAddress = useFormattedAddress(
    account?.address,
    account ? getAccountGenesisHash(account) : null
  )

  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={0}
      className={classNames(
        "flex h-14.5 w-full items-center gap-4 px-12 text-left text-body-secondary hover:bg-grey-750 hover:text-body focus:bg-grey-700",
        selected && "bg-grey-800",
        "disabled:cursor-not-allowed disabled:opacity-50"
      )}
    >
      {account ? (
        <AccountIcon
          address={account.address}
          genesisHash={getAccountGenesisHash(account)}
          className="shrink-0 text-lg"
        />
      ) : (
        <AllAccountsIcon className="shrink-0 text-lg" />
      )}
      <div className="flex grow items-center overflow-hidden">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center gap-2">
            <div className="truncate text-body">
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
            {account && <AccountTypeIcon type={account.type} className="text-primary" />}
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
