import { TreeFolder } from "@extension/core"
import { AccountJsonAny } from "@extension/core"
import { WithTooltip } from "@talisman/components/Tooltip"
import { classNames } from "@talismn/util"
import { AllAccountsIcon } from "@ui/domains/Account/AllAccountsIcon"
import { useSearchParamsSelectedFolder } from "@ui/hooks/useSearchParamsSelectedFolder"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useSelectedAccount } from "../Portfolio/useSelectedAccount"
import { AccountFolderIcon } from "./AccountFolderIcon"
import { AccountIcon } from "./AccountIcon"

const Avatar = ({
  account,
  folder,
  className,
}: {
  className?: string
  account?: AccountJsonAny
  folder?: TreeFolder
}) => {
  return account?.address ? (
    <AccountIcon
      className={className}
      address={account.address}
      genesisHash={account.genesisHash}
    />
  ) : folder ? (
    <div className={className}>
      <AccountFolderIcon className={classNames("account-avatar", className)} />
    </div>
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
  const { folder } = useSearchParamsSelectedFolder()
  const { t } = useTranslation()
  const tooltip = useMemo(() => {
    if (!withTooltip) return
    return account ? account.name : folder ? folder.name : t("All accounts")
  }, [t, account, folder, withTooltip])

  if (withTooltip)
    return (
      <WithTooltip as="div" tooltip={tooltip} className="flex flex-col justify-center">
        <Avatar account={account} folder={folder} className={className} />
      </WithTooltip>
    )

  return <Avatar account={account} folder={folder} className={className} />
}
