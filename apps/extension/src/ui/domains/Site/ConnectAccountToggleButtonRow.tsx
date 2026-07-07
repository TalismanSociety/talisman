import type { Account } from "@core/domains/keyring/exports"
import { getAccountGenesisHash, getAccountSignetUrl } from "@core/domains/keyring/exports"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { AccountIcon } from "../Account/AccountIcon"
import { AccountTypeIcon } from "../Account/AccountTypeIcon"
import { Address } from "../Account/Address"

const PrimaryBadge: FC = () => {
  const { t } = useTranslation()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="shrink-0 rounded-xs bg-primary/10 px-3 py-1 text-primary text-tiny">
          {t("Primary")}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {t("The primary account is the active account from the app's point of view")}
      </TooltipContent>
    </Tooltip>
  )
}

export const ConnectAccountToggleButtonRow: FC<{
  account: Account
  showAddress?: boolean
  checked?: boolean
  isPrimary?: boolean
  onClick?: () => void
}> = ({ account, checked: isConnected, isPrimary, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex h-24 w-full shrink-0 items-center gap-6 px-6 hover:bg-field",
      !isConnected && "text-body-secondary"
    )}
  >
    <AccountIcon
      className="shrink-0 text-lg"
      address={account.address}
      genesisHash={getAccountGenesisHash(account)}
    />
    <div className="truncate text-left text-sm">
      <Tooltip placement="bottom-start">
        <TooltipTrigger asChild>
          <span>
            {account?.name ?? (
              <Address address={account.address} startCharCount={8} endCharCount={8} noTooltip />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <Address
            address={account.address}
            startCharCount={8}
            endCharCount={8}
            noTooltip
            noShorten
          />
        </TooltipContent>
      </Tooltip>
    </div>
    <AccountTypeIcon
      type={account.type}
      className="text-primary"
      signetUrl={getAccountSignetUrl(account)}
    />
    <div className="grow"></div>
    {isPrimary && <PrimaryBadge />}
    <div
      className={cn(
        "mx-2 h-4 w-4 shrink-0 rounded-full",
        isConnected ? "bg-primary" : "bg-grey-700"
      )}
    ></div>
  </button>
)
