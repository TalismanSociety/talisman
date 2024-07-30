import { CopyIcon, ExternalLinkIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { ChainId, EvmNetworkId } from "extension-core"
import { FC, useCallback, useMemo } from "react"
import urlJoin from "url-join"

import useChain from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { copyAddress } from "@ui/util/copyAddress"

import { Address } from "./Address"

type NetworkAddressProps = {
  address: string
  networkId: ChainId | EvmNetworkId
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
  const evmNetwork = useEvmNetwork(networkId)
  const chain = useChain(networkId)

  const blockExplorerUrl = useMemo(() => {
    const baseUrl = evmNetwork?.explorerUrl ?? chain?.subscanUrl ?? null
    return baseUrl ? urlJoin(baseUrl, "address", address) : null
  }, [address, chain?.subscanUrl, evmNetwork?.explorerUrl])

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
          className="shrink-0 opacity-80 hover:opacity-100 "
        >
          <CopyIcon />
        </button>
      )}
    </span>
  )
}
