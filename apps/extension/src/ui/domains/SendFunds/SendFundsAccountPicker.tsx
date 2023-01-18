import { AccountJsonAny } from "@core/domains/accounts/types"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { CheckCircleIcon, SearchIcon, TalismanHandIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { useSendFunds } from "@ui/apps/popup/pages/SendFunds/context"
import useAccounts from "@ui/hooks/useAccounts"
import useBalances from "@ui/hooks/useBalances"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import { useDebouncedState } from "@ui/hooks/useDebouncedState"
import { default as debounce } from "lodash/debounce"
import { ChangeEventHandler, FC, useCallback, useEffect, useMemo, useState } from "react"
import { FormFieldInputContainerProps, FormFieldInputText, classNames } from "talisman-ui"

import AccountAvatar from "../Account/Avatar"
import Fiat from "../Asset/Fiat"
import { SendFundsSearchInput } from "./SendFundsSearchInput"

type AccountRowProps = { account: AccountJsonAny; selected: boolean; onClick?: () => void }

const AccountRow: FC<AccountRowProps> = ({ account, selected, onClick }) => {
  const balance = useBalancesByAddress(account.address)

  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={1}
      className={classNames(
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full items-center gap-4 px-12 text-left",
        selected && "bg-grey-800 text-body-secondary"
      )}
    >
      <AccountAvatar address={account.address} className="!text-lg" />
      <div className="grow overflow-hidden text-ellipsis whitespace-nowrap">
        {account.name ?? shortenAddress(account.address)}
        {selected && <CheckCircleIcon className="ml-3 inline" />}
      </div>
      <div className="text-body-secondary whitespace-nowrap">
        <Fiat amount={balance.sum.fiat("usd").total} currency="usd" isBalance />
      </div>
    </button>
  )
}

type AccountsListProps = {
  selected: string | null
  search?: string
  genesisHash?: string
  onSelect?: (address: string) => void
}

const AccountsList: FC<AccountsListProps> = ({ selected, search, genesisHash, onSelect }) => {
  const allAccounts = useAccounts()

  // TODO if we have a tokenId, filter account types
  const accounts = useMemo(() => {
    return allAccounts
      .filter((account) => !search || account.name?.toLowerCase().includes(search))
      .filter((account) => !genesisHash || account.genesisHash === genesisHash)
  }, [allAccounts, genesisHash, search])

  const handleAccountClick = useCallback(
    (address: string) => () => {
      onSelect?.(address)
    },
    [onSelect]
  )

  return (
    <div className="min-h-full space-y-6">
      {/* <div className="text-body-secondary px-12 font-bold">
        <TalismanHandIcon className="mr-2 inline-block" />
        My Accounts
      </div> */}
      <div>
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
            No account matches your search
          </div>
        )}
      </div>
    </div>
  )
}

const INPUT_CONTAINER_PROPS: FormFieldInputContainerProps = {
  small: true,
  className: "!px-8 h-[4.6rem] my-1 !bg-black-tertiary",
}

export const SendFundsAccountPicker = () => {
  const { from, set } = useSendFunds()
  const [search, setSearch] = useState("")

  // const handleSearchChange: ChangeEventHandler<HTMLInputElement> = useCallback(
  //   (e) => {
  //     setSearch(e.target.value)
  //   },
  //   [setSearch]
  // )

  const handleAccountClick = useCallback(
    (address: string) => {
      set("from", address, true)
    },
    [set]
  )

  return (
    <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
      <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
        <div className="font-bold">From</div>
        <div className="grow">
          <SendFundsSearchInput onChange={setSearch} placeholder="Search by account name" />
          {/* <FormFieldInputText
            className="text-base"
            containerProps={INPUT_CONTAINER_PROPS}
            before={<SearchIcon className="text-body-disabled" />}
            placeholder="Search by account name"
            onChange={handleSearchChange}
          /> */}
        </div>
      </div>
      <ScrollContainer className=" bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
        <AccountsList selected={from} search={search} onSelect={handleAccountClick} />
      </ScrollContainer>
      {/* <div className="bg-black-secondary border-grey-700 scrollable scrollable-800 w-full grow overflow-y-auto border-t">
        <AccountsList />
      </div> */}
      {/* <div className="min-h-full w-full grow border-t">
        <AccountsList selected={from} search={search} onSelect={handleAccountClick} />
      </div> */}
    </div>
  )
}
