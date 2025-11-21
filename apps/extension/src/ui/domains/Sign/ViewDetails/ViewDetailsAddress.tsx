import { getBlockExplorerUrls, Network } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/crypto"
import { CopyIcon, ExternalLinkIcon } from "@talismn/icons"
import { FC, useCallback, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { useAccountByAddress } from "@ui/state"
import { copyAddress } from "@ui/util/copyAddress"

import { ViewDetailsField, ViewDetailsFieldProps } from "./ViewDetailsField"

export const ViewDetailsAddress: FC<
  ViewDetailsFieldProps & {
    network: Network | null | undefined
    address?: string
  }
> = ({ address, network, ...fieldProps }) => {
  const account = useAccountByAddress(address)

  const formatted = useMemo(
    () =>
      address
        ? encodeAnyAddress(address, {
            ss58Format: network?.platform === "polkadot" ? network.prefix : undefined,
          })
        : "",
    [address, network],
  )

  const blockExplorerUrl = useMemo(() => {
    if (!formatted || !network) return null
    const urls = getBlockExplorerUrls(network, { type: "address", address: formatted })
    return urls[0] ?? null
  }, [formatted, network])

  const handleClick = useCallback(() => {
    if (!formatted) return
    if (blockExplorerUrl) window.open(blockExplorerUrl, "_blank")
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
