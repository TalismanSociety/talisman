import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { Balance } from "@talismn/balances"
import { CheckCircleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import useAccounts from "@ui/hooks/useAccounts"
import { FC, ReactNode, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { AccountIcon } from "../Account/AccountIcon"
import { CopyAddressLayout } from "./CopyAddressLayout"
import { useCopyAddressWizard } from "./useCopyAddressWizard"

type AccountPickerAccount = {
  address: string
  name?: string
  genesisHash?: string | null
  balance?: Balance
}

type AccountRowProps = {
  account: AccountPickerAccount
  selected: boolean
  onClick?: () => void
  disabled?: boolean
}

const AccountRow: FC<AccountRowProps> = ({ account, selected, onClick, disabled }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={0}
      className={classNames(
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full items-center gap-4 px-12 text-left",
        selected && "bg-grey-800 text-body-secondary",
        "disabled:cursor-not-allowed disabled:opacity-50"
      )}
      disabled={disabled}
    >
      <AccountIcon
        address={account.address}
        genesisHash={account.genesisHash}
        className="!text-lg"
      />
      <div className="grow overflow-hidden text-ellipsis whitespace-nowrap">
        {account.name ?? shortenAddress(account.address, 6, 6)}
        {selected && <CheckCircleIcon className="ml-3 inline" />}
      </div>
    </button>
  )
}

type AccountsListProps = {
  accounts: AccountPickerAccount[]
  selected?: string | null
  onSelect?: (address: string) => void
  header?: ReactNode
}

export const AccountsList: FC<AccountsListProps> = ({ selected, accounts, onSelect, header }) => {
  const { t } = useTranslation()
  const handleAccountClick = useCallback(
    (address: string) => () => {
      onSelect?.(address)
    },
    [onSelect]
  )

  return (
    <div>
      {!!header && <div className="text-body-secondary mb-4 mt-8 px-12 font-bold">{header}</div>}
      {accounts?.map((account) => (
        <AccountRow
          selected={account.address === selected}
          key={account.address}
          account={account}
          onClick={handleAccountClick(account.address)}
        />
      ))}
      {!accounts?.length && (
        <div className="text-body-secondary flex h-[5.8rem] w-full items-center px-12 text-left">
          {t("No account matches your search")}
        </div>
      )}
    </div>
  )
}

export const CopyAddressAccountForm = () => {
  const { address, setAddress } = useCopyAddressWizard()
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const allAccounts = useAccounts()

  const accounts = useMemo(
    () => allAccounts.filter((account) => !search || account.name?.toLowerCase().includes(search)),
    [allAccounts, search]
  )

  return (
    <CopyAddressLayout title={t("Select account")}>
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <div className="grow">
            <SearchInput onChange={setSearch} placeholder={t("Search by account name")} />
          </div>
        </div>
        <ScrollContainer className=" bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
          <AccountsList accounts={accounts} selected={address} onSelect={setAddress} />
        </ScrollContainer>
      </div>
    </CopyAddressLayout>
  )
}
