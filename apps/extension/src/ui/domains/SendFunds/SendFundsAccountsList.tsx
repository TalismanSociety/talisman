import type { LegacyAccountOrigin } from "@core/domains/accounts/types"
import type { Balance } from "@talismn/balances"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useScrollContainer } from "@ui/components/ScrollContainer"
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
  /** When true, renders account rows using a virtualizer for large lists. Only enable when this is the sole list inside a ScrollContainer. */
  virtualized?: boolean
}

type AccountWithBalance = SendFundsAccount & {
  balance?: Balance
  disabled: boolean
}

const ACCOUNT_ROW_HEIGHT = 58

const VirtualizedAccountRows: FC<{
  accounts: AccountWithBalance[]
  selected?: string | null
  genesisHash?: `0x${string}` | null
  noFormat?: boolean
  showBalances?: boolean
  token: ReturnType<typeof useToken>
  allowZeroBalance?: boolean
  onAccountClick: (address: string) => () => void
}> = ({
  accounts,
  selected,
  genesisHash,
  noFormat,
  showBalances,
  token,
  allowZeroBalance,
  onAccountClick,
}) => {
  const { ref: refContainer } = useScrollContainer()
  const ref = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: accounts.length,
    estimateSize: () => ACCOUNT_ROW_HEIGHT,
    overscan: 5,
    getScrollElement: () => refContainer.current,
  })

  return (
    <div ref={ref}>
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((item) => {
          const account = accounts[item.index]
          if (!account) return null

          return (
            <div
              key={account.address}
              className="absolute top-0 left-0 w-full"
              style={{
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <AccountRow
                selected={account.address === selected}
                account={account}
                genesisHash={genesisHash}
                noFormat={noFormat}
                onClick={onAccountClick(account.address)}
                showBalances={showBalances}
                token={token}
                disabled={!allowZeroBalance && account.disabled}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
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
  virtualized,
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
      {virtualized
        ? accountsWithBalance.length > 0 && (
            <VirtualizedAccountRows
              accounts={accountsWithBalance}
              selected={selected}
              genesisHash={genesisHash}
              noFormat={noFormat}
              showBalances={showBalances}
              token={token}
              allowZeroBalance={allowZeroBalance}
              onAccountClick={handleAccountClick}
            />
          )
        : accountsWithBalance.map((account) => (
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
        <div className="flex h-[5.8rem] w-full items-center px-12 text-left text-body-secondary">
          {t("No account matches your search")}
        </div>
      )}
    </div>
  )
}
