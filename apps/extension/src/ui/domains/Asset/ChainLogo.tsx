import globeIcon from "@talisman/theme/icons/globe.white.svg?url"
import { classNames } from "@talisman/util/classNames"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { getBase64ImageUrl } from "@talismn/util"
import useChain from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { FC, useEffect, useMemo, useState } from "react"

const GLOBE_ICON_URL = getBase64ImageUrl(globeIcon)

type ChainLogoBaseProps = {
  id?: ChainId | EvmNetworkId
  name?: string
  logo?: string
  iconUrls?: string[]
  className?: string
}

export const ChainLogoBase: FC<ChainLogoBaseProps> = ({ id, name, logo, iconUrls, className }) => {
  const [error, setError] = useState(false)

  useEffect(() => {
    setError(false)
  }, [logo])

  return (
    <picture
      className={classNames(
        //"chain-logo", "network-logo", // TODO MERGE verify it's not needed
        "relative inline-block h-[1em] w-[1em] shrink-0",
        className
      )}
    >
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
      <img
        src={GLOBE_ICON_URL ?? ""}
        className="absolute top-0 left-0 h-full w-full"
        alt={name}
        data-id={id}
        onError={() => setError(true)}
      />
    </picture>
  )
}

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
