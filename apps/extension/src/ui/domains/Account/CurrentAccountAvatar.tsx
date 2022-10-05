import { AccountJsonAny } from "@core/domains/accounts/types"
import { WithTooltip } from "@talisman/components/Tooltip"
import { AllAccountsIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import AccountAvatar from "@ui/domains/Account/Avatar"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useMemo } from "react"

const Avatar = ({ account, className }: { className?: string; account?: AccountJsonAny }) => {
  return account?.address ? (
    <AccountAvatar
      className={className}
      address={account.address}
      genesisHash={account.genesisHash}
    />
  ) : (
    <div className={className}>
      <AllAccountsIcon className={classNames("account-avatar", className)} />
    </div>
  )
}

export const CurrentAccountAvatar = ({
  className,
  withTooltip,
}: {
  className?: string
  withTooltip?: boolean
}) => {
  const { account } = useSelectedAccount()
  const tooltip = useMemo(() => {
    if (!withTooltip) return
    return account ? account.name : "All accounts"
  }, [account, withTooltip])

  return withTooltip ? (
    <WithTooltip tooltip={tooltip}>
      <Avatar account={account} className={className} />
    </WithTooltip>
  ) : (
    <Avatar account={account} className={className} />
  )
}
