import { isEthereumAddress } from "@polkadot/util-crypto"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { Address, Balance } from "@talismn/balances"
import { Token, TokenId } from "@talismn/chaindata-provider"
import { CheckCircleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import useAccounts from "@ui/hooks/useAccounts"
import useBalances from "@ui/hooks/useBalances"
import useChain from "@ui/hooks/useChain"
import useToken from "@ui/hooks/useToken"
import { isEvmToken } from "@ui/util/isEvmToken"
import { FC, ReactNode, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Fiat } from "../Asset/Fiat"
import Tokens from "../Asset/Tokens"
import { AccountIcon } from "./AccountIcon"

type AccountPickerAccount = {
  address: string
  name?: string
  genesisHash?: string | null
  balance?: Balance
}

type AccountRowProps = {
  account: AccountPickerAccount
  selected: boolean
  showBalances?: boolean
  token?: Token | null
  onClick?: () => void
  disabled?: boolean
}

const AccountTokenBalance = ({ token, balance }: { token?: Token | null; balance?: Balance }) => {
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
        <Fiat amount={balance.transferable} isBalance noCountUp />
      </div>
    </div>
  )
}

const AccountRow: FC<AccountRowProps> = ({
  account,
  selected,
  onClick,
  showBalances,
  token,
  disabled,
}) => {
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
      {showBalances && <AccountTokenBalance token={token} balance={account.balance} />}
    </button>
  )
}

type AccountsListProps = {
  accounts: AccountPickerAccount[]
  selected?: string | null
  onSelect?: (address: string) => void
  header?: ReactNode
  allowZeroBalance?: boolean
  showIfEmpty?: boolean
  showBalances?: boolean
  tokenId?: string
}

export const AccountsList: FC<AccountsListProps> = ({
  selected,
  accounts,
  onSelect,
  header,
  allowZeroBalance,
  showIfEmpty,
  showBalances,
  tokenId,
}) => {
  const { t } = useTranslation()
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

type AccountPickerProps = {
  selected?: Address
  tokenId?: TokenId
  allowZeroBalance: boolean
  searchPrefix?: ReactNode
  onSelect?: (address: Address) => void
}

export const AccountPicker: FC<AccountPickerProps> = ({
  selected,
  tokenId,
  allowZeroBalance,
  searchPrefix,
  onSelect,
}) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const token = useToken(tokenId)
  const chain = useChain(token?.chain?.id)

  const allAccounts = useAccounts()

  const accounts = useMemo(
    () =>
      allAccounts
        .filter((account) => !search || account.name?.toLowerCase().includes(search))
        .filter((account) => {
          if (!tokenId) return true
          if (!token) return false

          if (isEthereumAddress(account.address))
            return isEvmToken(token) || chain?.account === "secp256k1"
          else return chain && chain?.account !== "secp256k1"
        })
        .filter(
          (account) => !chain || !account.genesisHash || account.genesisHash === chain?.genesisHash
        ),
    [allAccounts, chain, search, token, tokenId]
  )

  return (
    <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
      <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
        {!!searchPrefix && <div className="font-bold">{t("From")}</div>}
        <div className="grow">
          <SearchInput onChange={setSearch} placeholder={t("Search by account name")} />
        </div>
      </div>
      <ScrollContainer className=" bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
        <AccountsList
          accounts={accounts}
          selected={selected}
          onSelect={onSelect}
          showBalances
          tokenId={tokenId}
          showIfEmpty
          allowZeroBalance={allowZeroBalance}
        />
      </ScrollContainer>
    </div>
  )
}
