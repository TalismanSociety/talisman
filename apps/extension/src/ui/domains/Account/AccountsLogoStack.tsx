import type { Account } from "@core/domains/keyring/exports"
import { WithTooltip } from "@ui/components/WithTooltip"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { useAccounts } from "@ui/state/accounts"
import { cn } from "@ui/util/cn"
import { useMemo } from "react"

type Props = { addresses?: string[]; className?: string; max?: number }

export const AccountsLogoStack = ({ addresses, className, max = 4 }: Props) => {
  const accounts = useAccounts()

  const filteredAccounts = useMemo(
    () => accounts.filter((account) => addresses?.includes(account.address)),
    [accounts, addresses]
  )
  const { visibleAccounts, moreAccounts } = useMemo(
    () => ({
      visibleAccounts: filteredAccounts?.slice(0, max) ?? [],
      moreAccounts: filteredAccounts?.slice(max) ?? [],
    }),
    [filteredAccounts, max]
  )

  return (
    <div className={cn("shrink-0 whitespace-nowrap pl-[0.25em]", className)}>
      {visibleAccounts.map((account) => (
        <AccountsLogoStackItem key={account.address} account={account} />
      ))}
      <AccountsLogoStackMore accounts={moreAccounts} />
    </div>
  )
}

const AccountsLogoStackItem = ({ account }: { account?: Account }) => {
  if (!account) return null
  return (
    <div className="-ml-[0.25em] inline-block h-[1em] w-[1em] overflow-hidden">
      <WithTooltip tooltip={account?.name}>
        <AccountIcon address={account.address} />
      </WithTooltip>
    </div>
  )
}

const AccountsLogoStackMore = ({ accounts }: { accounts: Account[] }) => {
  if (!accounts.length) return null
  return (
    <div className="-ml-[0.25em] inline-block h-[1em] w-[1em] overflow-hidden">
      <WithTooltip tooltip={<MoreAccountsTooltip accounts={accounts} />}>
        <div className="relative flex h-[1em] w-[1em] flex-col justify-center overflow-hidden rounded-full bg-body-secondary text-center text-black">
          <div className="font-bold text-[0.5em] leading-[1em]">+{accounts.length}</div>
        </div>
      </WithTooltip>
    </div>
  )
}

const MoreAccountsTooltip = ({ accounts }: { accounts: Account[] }) => (
  <div className="text-left">
    {accounts.map(({ name, address }) => (
      <div key={address}>{name}</div>
    ))}
  </div>
)
