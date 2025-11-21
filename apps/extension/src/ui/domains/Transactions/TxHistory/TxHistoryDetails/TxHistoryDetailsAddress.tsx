import { getBlockExplorerUrls, NetworkId } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/crypto"
import { CopyIcon, ExternalLinkIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { getAccountGenesisHash } from "extension-core"
import { FC, useCallback, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { useAccountByAddress, useNetworkById } from "@ui/state"
import { copyAddress } from "@ui/util/copyAddress"

export const TxHistoryDetailsAddress: FC<{
  address: string
  networkId: NetworkId
  className?: string
}> = ({ address, networkId, className }) => {
  const account = useAccountByAddress(address)
  const network = useNetworkById(networkId)

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
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "text-body inline-flex max-w-full items-center gap-2 overflow-hidden align-sub",
            className,
          )}
        >
          <AccountIcon
            address={formatted}
            genesisHash={getAccountGenesisHash(account)}
            className="text-md"
          />
          {account ? (
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">{account.name}</div>
          ) : (
            <Address
              noTooltip
              address={formatted}
              startCharCount={8}
              endCharCount={8}
              className="leading-none"
            />
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
  )
}
