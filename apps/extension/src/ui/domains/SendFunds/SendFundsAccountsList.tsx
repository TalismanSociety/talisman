import { CheckCircleIcon, LoaderIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { classNames } from "@talismn/util"
import { useBalance } from "@ui/hooks/useBalance"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import useToken from "@ui/hooks/useToken"
import { FC, ReactNode, useCallback } from "react"

import AccountAvatar from "../Account/Avatar"
import Fiat from "../Asset/Fiat"
import Tokens from "../Asset/Tokens"

type SendFundsAccount = {
  address: string
  name?: string
  genesisHash?: string | null
}

type AccountRowProps = {
  account: SendFundsAccount
  selected: boolean
  showBalances?: boolean
  tokenId?: string | null
  onClick?: () => void
}

const AccountGlobalBalance = ({ address }: { address: string }) => {
  const balances = useBalancesByAddress(address)

  return (
    <div className="text-body-secondary whitespace-nowrap">
      <Fiat amount={balances.sum.fiat("usd").transferable} currency="usd" isBalance />
    </div>
  )
}

const AccountTokenBalance = ({
  address,
  tokenId,
}: {
  address: string
  tokenId?: string | null
}) => {
  const balance = useBalance(address, tokenId as string)
  const token = useToken(tokenId)

  if (!balance || !token) return null

  return (
    <div
      className={classNames(
        "space-y-2 whitespace-nowrap text-right text-sm",
        balance.status === "cache" && "animate-pulse"
      )}
    >
      <div>
        <Tokens
          amount={balance.transferable.tokens}
          decimals={token.decimals}
          symbol={token.symbol}
          isBalance
          noCountUp
        />
      </div>
      <div className="text-body-secondary text-xs">
        <Fiat amount={balance.transferable.fiat("usd")} currency="usd" isBalance noCountUp />
      </div>
    </div>
  )
}

const AccountRow: FC<AccountRowProps> = ({ account, selected, onClick, showBalances, tokenId }) => {
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
      <AccountAvatar
        address={account.address}
        genesisHash={account.genesisHash}
        className="!text-lg"
      />
      <div className="grow overflow-hidden text-ellipsis whitespace-nowrap">
        {account.name ?? shortenAddress(account.address, 6, 6)}
        {selected && <CheckCircleIcon className="ml-3 inline" />}
      </div>
      {showBalances &&
        (tokenId ? (
          <AccountTokenBalance address={account.address} tokenId={tokenId} />
        ) : (
          <AccountGlobalBalance address={account.address} />
        ))}
    </button>
  )
}

type SendFundsAccountsListProps = {
  accounts: SendFundsAccount[]
  selected?: string | null
  onSelect?: (address: string) => void
  header?: ReactNode
  showIfEmpty?: boolean
  showBalances?: boolean
  tokenId?: string | null
}

export const SendFundsAccountsList: FC<SendFundsAccountsListProps> = ({
  selected,
  accounts,
  onSelect,
  header,
  showIfEmpty,
  showBalances,
  tokenId,
}) => {
  const handleAccountClick = useCallback(
    (address: string) => () => {
      onSelect?.(address)
    },
    [onSelect]
  )

  if (!showIfEmpty && !accounts?.length) return null

  return (
    <div>
      {!!header && <div className="text-body-secondary mt-8 mb-4 px-12 font-bold">{header}</div>}
      {accounts?.map((account) => (
        <AccountRow
          selected={account.address === selected}
          key={account.address}
          account={account}
          onClick={handleAccountClick(account.address)}
          showBalances={showBalances}
          tokenId={tokenId}
        />
      ))}
      {!accounts?.length && (
        <div className="text-body-secondary flex h-[5.8rem] w-full items-center px-12 text-left">
          No account matches your search
        </div>
      )}
    </div>
  )
}
