import { AccountJsonAny } from "@core/domains/accounts/types"
import { WithTooltip } from "@talisman/components/Tooltip"
import { AllAccountsIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { AccountIcon } from "./AccountIcon"

const Avatar = ({ account, className }: { className?: string; account?: AccountJsonAny }) => {
  return account?.address ? (
    <AccountIcon
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
  const { t } = useTranslation()
  const tooltip = useMemo(() => {
    if (!withTooltip) return
    return account ? account.name : t("All accounts")
  }, [t, account, withTooltip])

  return withTooltip ? (
    <WithTooltip as="div" tooltip={tooltip} className="flex flex-col justify-center">
      <Avatar account={account} className={className} />
    </WithTooltip>
  ) : (
    <Avatar account={account} className={className} />
  )
}
