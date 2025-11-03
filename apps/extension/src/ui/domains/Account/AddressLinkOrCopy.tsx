import { getBlockExplorerUrls, NetworkId } from "@talismn/chaindata-provider"
import { CopyIcon, ExternalLinkIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback, useMemo } from "react"

import { useAnyNetwork } from "@ui/state"
import { copyAddress } from "@ui/util/copyAddress"

import { Address } from "./Address"

type NetworkAddressProps = {
  address: string
  networkId: NetworkId
  className?: string
  mode?: "copy" | "link"
  noShorten?: boolean
  noOnChainId?: boolean
}

export const NetworkAddress: FC<NetworkAddressProps> = ({
  address,
  networkId,
  className,
  mode = "link",
  noShorten,
  noOnChainId,
}) => {
  const network = useAnyNetwork(networkId)

  const blockExplorerUrl = useMemo(() => {
    if (!network || !address) return null
    return getBlockExplorerUrls(network, { type: "address", address })[0] ?? null
  }, [address, network])

  const effectiveMode = useMemo(() => {
    // link must fallback to copy if no blockExplorerUrl
    return mode === "link" && blockExplorerUrl ? "link" : "copy"
  }, [blockExplorerUrl, mode])

  const handleClick = useCallback(() => {
    if (effectiveMode === "link" && blockExplorerUrl)
      window.open(blockExplorerUrl, "_blank", "noopener noreferrer")
    else copyAddress(address)
  }, [address, blockExplorerUrl, effectiveMode])

  return (
    <span className={classNames("inline-flex items-center gap-[0.5em]", className)}>
      <Address
        address={address}
        noShorten={noShorten}
        noOnChainId={noOnChainId}
        className="truncate"
      />
      {effectiveMode === "link" && blockExplorerUrl && (
        <a
          href={blockExplorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 opacity-80 hover:opacity-100"
        >
          <ExternalLinkIcon />
        </a>
      )}
      {effectiveMode === "copy" && (
        <button
          type="button"
          onClick={handleClick}
          className="shrink-0 opacity-80 hover:opacity-100"
        >
          <CopyIcon />
        </button>
      )}
    </span>
  )
}
