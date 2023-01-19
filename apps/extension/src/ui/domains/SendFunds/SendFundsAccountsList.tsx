import { AccountJsonAny } from "@core/domains/accounts/types"
import { CheckCircleIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import useAccounts from "@ui/hooks/useAccounts"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import { FC, useCallback, useMemo } from "react"
import { classNames } from "talisman-ui"

import AccountAvatar from "../Account/Avatar"
import Fiat from "../Asset/Fiat"

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

type SendFundsAccountsListProps = {
  selected: string | null
  search?: string
  genesisHash?: string
  onSelect?: (address: string) => void
}

export const SendFundsAccountsList: FC<SendFundsAccountsListProps> = ({
  selected,
  search,
  genesisHash,
  onSelect,
}) => {
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
