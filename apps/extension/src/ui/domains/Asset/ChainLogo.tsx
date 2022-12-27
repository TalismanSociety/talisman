import globeIcon from "@talisman/theme/icons/globe.white.svg?url"
import { classNames } from "@talisman/util/classNames"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { getBase64ImageUrl } from "@talismn/util"
import useChain from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { FC, useMemo, useState } from "react"
import styled from "styled-components"

const GLOBE_ICON_URL = getBase64ImageUrl(globeIcon)

type ChainLogoBaseProps = {
  id?: ChainId | EvmNetworkId
  name?: string
  logo?: string
  iconUrls?: string[]
  className?: string
}

export const ChainLogoBase = styled(
  ({ id, name, logo, iconUrls, className }: ChainLogoBaseProps) => {
    const [error, setError] = useState(false)

    return (
      <picture className={classNames("chain-logo", "network-logo", className)}>
        {error ? (
          <source srcSet={GLOBE_ICON_URL ?? undefined} />
        ) : (
          <>
            {iconUrls?.map((url, i) => (
              <source key={i} srcSet={url} />
            ))}
            <source srcSet={logo} />
          </>
        )}
        <img src={GLOBE_ICON_URL ?? ""} alt={name} data-id={id} onError={() => setError(true)} />
      </picture>
    )
  }
)`
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

type ChainLogoProps = {
  className?: string
  id?: ChainId | EvmNetworkId
}

export const ChainLogo: FC<ChainLogoProps> = ({ id, className }) => {
  const chain = useChain(id)
  const evmNetwork = useEvmNetwork(id)
  const evmNetworkSubstrateChain = useChain(evmNetwork?.substrateChain?.id)

  const props: ChainLogoBaseProps = useMemo(
    () => chain ?? evmNetworkSubstrateChain ?? evmNetwork ?? {},
    [chain, evmNetwork, evmNetworkSubstrateChain]
  )

  return <ChainLogoBase {...props} className={className} />
}
