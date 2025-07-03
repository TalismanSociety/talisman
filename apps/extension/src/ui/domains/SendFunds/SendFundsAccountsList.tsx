import { Balance } from "@talismn/balances"
import { LegacyAccountOrigin } from "extension-core"
import { FC, ReactNode, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useBalances, useToken } from "@ui/state"

import { AccountRow } from "./AccountRow"

export type SendFundsAccount = {
  address: string
  origin?: LegacyAccountOrigin
  name?: string
  genesisHash?: `0x${string}` | null
  balance?: Balance
}

type SendFundsAccountsListProps = {
  accounts: SendFundsAccount[]
  genesisHash?: `0x${string}` | null
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
  const { t } = useTranslation()
  const handleAccountClick = useCallback(
    (address: string) => () => {
      onSelect?.(address)
    },
    [onSelect],
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
