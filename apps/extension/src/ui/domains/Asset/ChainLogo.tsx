import globeIcon from "@talisman/theme/icons/globe.white.svg?url"
import { classNames } from "@talisman/util/classNames"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { getBase64ImageUrl } from "@talismn/util"
import useChain from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useState } from "react"
import styled from "styled-components"

type ChainLogoProps = {
  className?: string
  id?: ChainId | EvmNetworkId
}

export const ChainLogo = styled(({ id, className }: ChainLogoProps) => {
  const chain = useChain(id)
  const evmNetwork = useEvmNetwork(id)
  const evmNetworkSubstrateChain = useChain(evmNetwork?.substrateChain?.id)
  const [error, setError] = useState(false)

  return (
    <picture className={classNames("chain-logo", "network-logo", className)}>
      {error ? (
        <source srcSet={getBase64ImageUrl(globeIcon) ?? undefined} />
      ) : (
        <>
          {evmNetwork &&
            "iconUrls" in evmNetwork &&
            evmNetwork.iconUrls?.map((url, i) => <source key={i} srcSet={url} />)}
          <source
            srcSet={chain?.logo ?? evmNetworkSubstrateChain?.logo ?? evmNetwork?.logo ?? undefined}
          />
        </>
      )}
      <img
        src={getBase64ImageUrl(globeIcon) ?? ""}
        alt={chain?.name ?? evmNetworkSubstrateChain?.name ?? evmNetwork?.name ?? undefined}
        data-id={id}
        onError={() => setError(true)}
      />
    </picture>
  )
})`
  display: block;
  position: relative;
  width: 1em;
  height: 1em;
  flex-shrink: 0;

  img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
`
