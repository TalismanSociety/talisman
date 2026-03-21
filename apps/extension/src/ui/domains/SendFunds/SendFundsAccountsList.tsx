import type { LegacyAccountOrigin } from "@core/domains/accounts/types"
import type { Balance } from "@talismn/balances"
import { useBalances } from "@ui/state/balances"
import { useToken } from "@ui/state/chaindata"
import { type FC, type ReactNode, useCallback, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"

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
    [onSelect]
  )

  const token = useToken(tokenId)
  const balances = useBalances()

  // Capture the selected account at mount time so the sort order stays stable.
  // When the modal re-opens, the component remounts and picks up the new value.
  const initialSelectedRef = useRef(selected)

  const accountsWithBalance = useMemo(() => {
    return accounts
      .map((account) => ({
        ...account,
        balance: balances.find({ address: account.address, tokenId }).sorted[0],
      }))
      .sort((a, b) => {
        // Pin the initially-selected account to the top
        if (a.address === initialSelectedRef.current) return -1
        if (b.address === initialSelectedRef.current) return 1

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
  }, [accounts, balances, tokenId])

  if (!showIfEmpty && !accounts?.length) return null

  return (
    <div>
      {!!header && <div className="mt-8 mb-4 px-12 font-bold text-body-secondary">{header}</div>}
      {accountsWithBalance.map((account) => (
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
        <div className="flex h-[3.625rem] w-full items-center px-12 text-left text-body-secondary">
          {t("No account matches your search")}
        </div>
      )}
    </div>
  )
}
