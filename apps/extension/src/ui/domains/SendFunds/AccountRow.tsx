import { Balance } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"
import { CheckCircleIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { AccountType } from "extension-core"
import { useMemo } from "react"

import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"
import { useSelectedCurrency } from "@ui/state"

import { AccountIcon } from "../Account/AccountIcon"
import { AccountTypeIcon } from "../Account/AccountTypeIcon"
import { Address } from "../Account/Address"
import { Fiat } from "../Asset/Fiat"
import { Tokens } from "../Asset/Tokens"

type AccountRowAccount = {
  address: string
  type?: AccountType
  name?: string
  genesisHash?: `0x${string}` | null
  balance?: Balance | undefined
  total?: number
}

type AccountRowProps = {
  account: AccountRowAccount
  genesisHash?: `0x${string}` | null
  selected: boolean
  showBalances?: boolean
  showTotalBalance?: boolean
  token?: Token | null
  onClick?: () => void
  disabled?: boolean
  noFormat?: boolean
  className?: string
  onClear?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}

export const AccountRow = ({
  account,
  genesisHash,
  noFormat,
  selected,
  onClick,
  showBalances,
  showTotalBalance,
  token,
  disabled,
  className,
  onClear,
}: AccountRowProps) => {
  const formattedAddress = useFormattedAddress(account?.address, genesisHash ?? account.genesisHash)

  const displayAddress = useMemo(
    () => (noFormat ? account?.address : formattedAddress),
    [noFormat, account?.address, formattedAddress],
  )

  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={0}
      className={classNames(
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full items-center gap-4 px-12 text-left",
        selected && "bg-grey-800 text-body-secondary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      disabled={disabled}
    >
      <AccountIcon
        address={account.address}
        genesisHash={account.genesisHash}
        className="!text-xl"
      />
      <div className="flex grow items-center justify-between overflow-hidden">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center gap-2">
            <div className="truncate">
              {account.name ?? (
                <Address address={displayAddress} startCharCount={6} endCharCount={6} noTooltip />
              )}
            </div>
            <AccountTypeIcon type={account.type} className="text-primary" />
          </div>
          <Address className="text-body-secondary text-xs" address={displayAddress} />
        </div>
        {selected && <CheckCircleIcon className="ml-3 inline shrink-0" />}
        {onClear && (
          <div onClick={onClear} role="button" tabIndex={0} onKeyDown={() => null}>
            <XIcon className="shrink-0 text-[1.2em]" />
          </div>
        )}
      </div>
      {(showBalances || showTotalBalance) && (
        <AccountTokenBalance
          token={token}
          balance={account.balance}
          total={account.total}
          showTotalBalance={showTotalBalance}
          showBalances={showBalances}
        />
      )}
    </button>
  )
}

const AccountTokenBalance = ({
  token,
  balance,
  total,
  showTotalBalance,
  showBalances,
}: {
  token?: Token | null
  balance?: Balance | undefined
  total?: number
  showTotalBalance?: boolean
  showBalances?: boolean
}) => {
  const currency = useSelectedCurrency()

  if (showTotalBalance && total) {
    return <Fiat amount={total} isBalance noCountUp className="text-sm" />
  }

  if (!showBalances || !balance || !token) return null

  return (
    <div
      className={classNames(
        "space-y-2 whitespace-nowrap text-right text-sm",
        balance.status === "cache" && "animate-pulse",
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
        <Fiat amount={balance.transferable.fiat(currency)} isBalance noCountUp />
      </div>
    </div>
  )
}
