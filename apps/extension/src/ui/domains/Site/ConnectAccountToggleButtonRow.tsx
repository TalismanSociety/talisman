import { AccountJsonAny } from "@extension/core"
import { classNames } from "@talismn/util"
import { FC } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AccountIcon } from "../Account/AccountIcon"
import { AccountTypeIcon } from "../Account/AccountTypeIcon"
import { Address } from "../Account/Address"

export const ConnectAccountToggleButtonRow: FC<{
  account: AccountJsonAny
  showAddress?: boolean
  checked?: boolean
  onClick?: () => void
}> = ({ account, checked: isConnected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={classNames(
      "hover:bg-field flex h-24 w-full shrink-0 items-center gap-6 px-6",
      !isConnected && "text-body-secondary"
    )}
  >
    <AccountIcon
      className="shrink-0 text-lg"
      address={account.address}
      genesisHash={account?.genesisHash}
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
      origin={account.origin}
      className="text-primary"
      signetUrl={account.signetUrl as string}
    />
    <div className="grow"></div>
    <div
      className={classNames(
        "mx-2 h-4 w-4 shrink-0 rounded-full",
        isConnected ? "bg-primary" : "bg-grey-700"
      )}
    ></div>
  </button>
)
