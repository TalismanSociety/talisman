import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { IS_FIREFOX, UNKNOWN_NETWORK_URL } from "extension-shared"
import { FC, Suspense, useMemo } from "react"

import { useGithubImageUrl } from "@ui/hooks/useGithubImageUrl"
import { useChain, useEvmNetwork } from "@ui/state"

type ChainLogoBaseProps = {
  id?: ChainId | EvmNetworkId
  name?: string
  logo?: string | null
  iconUrls?: string[]
  className?: string
}

export const ChainLogoBase: FC<ChainLogoBaseProps> = ({ id, logo, className }) => {
  const { src, onError } = useGithubImageUrl(logo, UNKNOWN_NETWORK_URL)

  // use url as key to reset dom element in case url changes, otherwise onError can't fire again
  return (
    <img
      key={src}
      data-id={id}
      src={src}
      className={classNames("relative block aspect-square w-[1em] shrink-0", className)}
      alt=""
      crossOrigin={IS_FIREFOX ? undefined : "anonymous"}
      loading="lazy" // defers download, helps performance especially in chain lists
      onError={onError}
    />
  )
}

type ChainLogoProps = {
  className?: string
  id?: ChainId | EvmNetworkId
}

const ChainLogoInner: FC<ChainLogoProps> = ({ id, className }) => {
  const chain = useChain(id)
  const evmNetwork = useEvmNetwork(id)
  const evmNetworkSubstrateChain = useChain(evmNetwork?.substrateChain?.id)

  const props: ChainLogoBaseProps = useMemo(
    () => chain ?? evmNetworkSubstrateChain ?? evmNetwork ?? {},
    [chain, evmNetwork, evmNetworkSubstrateChain],
  )

  return <ChainLogoBase {...props} className={className} />
}

const ChainLogoFallback: FC<{ className?: string }> = ({ className }) => (
  <div
    className={classNames(
      "!bg-body-disabled !block h-[1em] w-[1em] shrink-0 overflow-hidden rounded-full",
      className,
    )}
  ></div>
)

export const ChainLogo: FC<ChainLogoProps> = (props) => (
  <Suspense fallback={<ChainLogoFallback className={props.className} />}>
    <ChainLogoInner {...props} />
  </Suspense>
)
