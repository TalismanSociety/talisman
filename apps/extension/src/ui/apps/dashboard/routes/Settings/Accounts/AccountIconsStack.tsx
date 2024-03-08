import { AccountJsonAny } from "@extension/core"
import { classNames } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { FC } from "react"

export const AccountsStack: FC<{ accounts: AccountJsonAny[]; className?: string }> = ({
  accounts,
  className,
}) => {
  if (!accounts.length) return null

  return (
    <div
      className={classNames(
        "ml-[0.4em] inline-block h-9 pl-0.5 leading-none [&>div]:ml-[-0.4em]",
        className
      )}
    >
      {accounts.slice(0, 3).map((account) => (
        <AccountIcon
          key={account.address}
          address={account.address}
          className="border-grey-800 box-content shrink-0 rounded-full border text-base"
        />
      ))}
    </div>
  )
}
