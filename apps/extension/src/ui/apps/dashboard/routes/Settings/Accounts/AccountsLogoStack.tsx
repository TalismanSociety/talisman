import { AccountJsonAny } from "@extension/core"
import { WithTooltip } from "@talisman/components/Tooltip"
import { classNames } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import useAccounts from "@ui/hooks/useAccounts"
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
    <div className={classNames("shrink-0 pl-[0.25em]", className)}>
      {visibleAccounts.map((account) => (
        <AccountsLogoStackItem key={account.address} account={account} />
      ))}
      <AccountsLogoStackMore accounts={moreAccounts} />
    </div>
  )
}

export const AccountsLogoStackItem = ({ account }: { account?: AccountJsonAny }) => {
  if (!account) return null
  return (
    <div className="-ml-[0.25em] inline-block h-[1em] w-[1em] overflow-hidden">
      <WithTooltip tooltip={account?.name}>
        <AccountIcon address={account.address} />
      </WithTooltip>
    </div>
  )
}

export const AccountsLogoStackMore = ({ accounts }: { accounts: AccountJsonAny[] }) => {
  if (!accounts.length) return null
  return (
    <div className="-ml-[0.25em] inline-block h-[1em] w-[1em] overflow-hidden">
      <WithTooltip tooltip={<MoreAccountsTooltip accounts={accounts} />}>
        <div className="bg-body-secondary relative flex h-[1em] w-[1em] flex-col justify-center overflow-hidden rounded-full text-center text-black">
          <div className="text-[0.5em] font-bold leading-[1em]">+{accounts.length}</div>
        </div>
      </WithTooltip>
    </div>
  )
}

const MoreAccountsTooltip = ({ accounts }: { accounts: AccountJsonAny[] }) => (
  <div className="text-left">
    {accounts.map(({ name, address }) => (
      <div key={address}>{name}</div>
    ))}
  </div>
)
