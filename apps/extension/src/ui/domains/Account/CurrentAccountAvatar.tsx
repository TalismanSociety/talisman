import type { TreeFolder } from "@core/domains/accounts/helpers.catalog"
import type { Account } from "@core/domains/keyring/exports"
import { getAccountGenesisHash } from "@core/domains/keyring/exports"
import { WithTooltip } from "@ui/components/WithTooltip"
import { AllAccountsIcon } from "@ui/domains/Account/AllAccountsIcon"
import { cn } from "@ui/util/cn"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { usePortfolioNavigation } from "../Portfolio/usePortfolioNavigation"
import { AccountFolderIcon } from "./AccountFolderIcon"
import { AccountIcon } from "./AccountIcon"

const Avatar = ({
  account,
  folder,
  className,
}: {
  className?: string
  account?: Account | null
  folder?: TreeFolder | null
}) => {
  return account?.address ? (
    <AccountIcon
      className={className}
      address={account.address}
      genesisHash={getAccountGenesisHash(account)}
    />
  ) : folder ? (
    <div className={className}>
      <AccountFolderIcon className={cn("account-avatar", className)} />
    </div>
  ) : (
    <div className={className}>
      <AllAccountsIcon className={cn("account-avatar", className)} />
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
  const { selectedAccount: account, selectedFolder: folder } = usePortfolioNavigation()

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
