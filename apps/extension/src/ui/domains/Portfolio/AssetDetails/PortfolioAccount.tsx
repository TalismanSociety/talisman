import { classNames } from "@talismn/util"
import { getAccountGenesisHash, getAccountSignetUrl } from "extension-core"
import { useTranslation } from "react-i18next"

import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { useAccountByAddress } from "@ui/state"

export const PortfolioAccount = ({
  address,
  className,
  textClassName,
}: {
  address: string
  className?: string
  textClassName?: string
}) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(address)
  if (!account) return null
  return (
    <div className={classNames("flex items-center gap-3", className)}>
      <AccountIcon
        className={textClassName ?? "!text-[1em]"}
        address={address}
        genesisHash={getAccountGenesisHash(account)}
      />
      <div
        className={classNames(
          "max-w-lg overflow-hidden text-ellipsis whitespace-nowrap",
          textClassName,
        )}
      >
        {account.name ?? t("Unknown")}
      </div>
      <AccountTypeIcon
        className="text-primary"
        type={account?.type}
        signetUrl={getAccountSignetUrl(account)}
      />
    </div>
  )
}
