import { AccountType } from "@extension/core"
import { Balance } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"
import { CheckCircleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import useBalances from "@ui/hooks/useBalances"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"
import useToken from "@ui/hooks/useToken"
import { FC, ReactNode, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { AccountIcon } from "../Account/AccountIcon"
import { AccountTypeIcon } from "../Account/AccountTypeIcon"
import { Address } from "../Account/Address"
import { Fiat } from "../Asset/Fiat"
import Tokens from "../Asset/Tokens"

export type SendFundsAccount = {
  address: string
  origin?: AccountType
  name?: string
  genesisHash?: string | null
  balance?: Balance
}

type AccountRowProps = {
  account: SendFundsAccount
  genesisHash?: string | null
  selected: boolean
  showBalances?: boolean
  token?: Token | null
  onClick?: () => void
  disabled?: boolean
  noFormat?: boolean
}

const AccountTokenBalance = ({ token, balance }: { token?: Token | null; balance?: Balance }) => {
  const currency = useSelectedCurrency()

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
        <Fiat amount={balance.transferable.fiat(currency)} isBalance noCountUp />
      </div>
    </div>
  )
}

const AccountRow: FC<AccountRowProps> = ({
  account,
  genesisHash,
  noFormat,
  selected,
  onClick,
  showBalances,
  token,
  disabled,
}) => {
  const formattedAddress = useFormattedAddress(
    account?.address,
    genesisHash ?? account?.genesisHash
  )

  const displayAddress = useMemo(
    () => (noFormat ? account?.address : formattedAddress),
    [noFormat, account?.address, formattedAddress]
  )

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
      <div className="flex grow items-center overflow-hidden">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center gap-2">
            <div className="truncate">
              {account.name ?? (
                <Address address={displayAddress} startCharCount={6} endCharCount={6} noTooltip />
              )}
            </div>
            <AccountTypeIcon origin={account.origin} className="text-primary" />
          </div>
          <Address className="text-body-secondary text-xs" address={displayAddress} />
        </div>
        {selected && <CheckCircleIcon className="ml-3 inline shrink-0" />}
      </div>
      {showBalances && <AccountTokenBalance token={token} balance={account.balance} />}
    </button>
  )
}

type SendFundsAccountsListProps = {
  accounts: SendFundsAccount[]
  genesisHash?: string | null
  noFormat?: boolean
  selected?: string | null
  onSelect?: (address: string) => void
  header?: ReactNode
  allowZeroBalance?: boolean
  showIfEmpty?: boolean
  showBalances?: boolean
  tokenId?: string
}

export const SendFundsAccountsList: FC<SendFundsAccountsListProps> = ({
  selected,
  accounts,
  noFormat,
  genesisHash,
  onSelect,
  header,
  allowZeroBalance,
  showIfEmpty,
  showBalances,
  tokenId,
}) => {
  const { t } = useTranslation("send-funds")
  const handleAccountClick = useCallback(
    (address: string) => () => {
      onSelect?.(address)
    },
    [onSelect]
  )

  const token = useToken(tokenId)
  const balances = useBalances()

  const accountsWithBalance = useMemo(() => {
    return accounts
      .map((account) => ({
        ...account,
        balance: balances.find({ address: account.address, tokenId }).sorted[0],
      }))
      .sort((a, b) => {
        // selected account first
        if (a.address === selected) return -1
        if (b.address === selected) return 1

        // then accounts by descending balance
        const balanceA = a.balance?.transferable.planck ?? 0n
        const balanceB = b.balance?.transferable.planck ?? 0n
        if (balanceA > balanceB) return -1
        if (balanceA < balanceB) return 1
        return 0
      })
      .map((account) => ({
        ...account,
        disabled: !account.balance || account.balance.transferable.planck === 0n,
      }))
  }, [accounts, balances, selected, tokenId])

  if (!showIfEmpty && !accounts?.length) return null

  return (
    <div>
      {!!header && <div className="text-body-secondary mb-4 mt-8 px-12 font-bold">{header}</div>}
      {accountsWithBalance?.map((account) => (
        <AccountRow
          selected={account.address === selected}
          key={account.address}
          account={account}
          genesisHash={genesisHash}
          noFormat={noFormat}
          onClick={handleAccountClick(account.address)}
          showBalances={showBalances}
          token={token}
          disabled={!allowZeroBalance && account.disabled}
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
