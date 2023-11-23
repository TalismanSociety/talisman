import { CopyIcon, ExternalLinkIcon } from "@talismn/icons"
import { encodeAnyAddress } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { copyAddress } from "@ui/util/copyAddress"
import { FC, useCallback, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"
import urlJoin from "url-join"

import { ViewDetailsField, ViewDetailsFieldProps } from "./ViewDetailsField"

export const ViewDetailsAddress: FC<
  ViewDetailsFieldProps & {
    address?: string
    blockExplorerUrl?: string | null
    chainPrefix?: number | null
  }
> = ({ address, blockExplorerUrl, chainPrefix, ...fieldProps }) => {
  const account = useAccountByAddress(address)

  const formatted = useMemo(
    () => (address ? encodeAnyAddress(address, chainPrefix ?? undefined) : ""),
    [address, chainPrefix]
  )

  const handleClick = useCallback(() => {
    if (!formatted) return
    if (blockExplorerUrl) window.open(urlJoin(blockExplorerUrl, "address", formatted), "_blank")
    else copyAddress(formatted)
  }, [blockExplorerUrl, formatted])

  if (!formatted) return null

  return (
    <ViewDetailsField {...fieldProps}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            className="flex w-full items-center gap-2 overflow-hidden"
          >
            <AccountIcon address={formatted} className="text-md" />
            {account ? (
              <div className="overflow-hidden text-ellipsis whitespace-nowrap">{account.name}</div>
            ) : (
              <Address noTooltip address={formatted} startCharCount={8} endCharCount={8} />
            )}
            {blockExplorerUrl ? (
              <ExternalLinkIcon className="shrink-0 text-base" />
            ) : (
              <CopyIcon className="shrink-0 text-base" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{formatted}</TooltipContent>
      </Tooltip>
    </ViewDetailsField>
  )
}
