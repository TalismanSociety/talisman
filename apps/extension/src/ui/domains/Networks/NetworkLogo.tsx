import { IS_FIREFOX, UNKNOWN_NETWORK_URL } from "@common/constants"
import type { Network, NetworkId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { useGithubImageUrl } from "@ui/hooks/useGithubImageUrl"
import { useNetworkById } from "@ui/state/chaindata"
import { type FC, Suspense, useId } from "react"

type NetworkLogoBaseProps = {
  network?: Network | null
  className?: string
}

const NetworkLogoBase: FC<NetworkLogoBaseProps> = ({ network, className }) => {
  const rid = useId()
  const { src, onError } = useGithubImageUrl(network?.logo, UNKNOWN_NETWORK_URL)

  // use url as key to reset dom element in case url changes, otherwise onError can't fire again
  return (
    <img
      key={`${rid}::${src}`}
      data-id={network?.id}
      src={src}
      className={classNames(
        "relative block aspect-square w-[1em] shrink-0 rounded-full",
        className
      )}
      alt=""
      crossOrigin={IS_FIREFOX ? undefined : "anonymous"}
      loading="lazy" // defers download, helps performance especially in chain lists
      onError={onError}
    />
  )
}

type NetworkLogoProps = {
  className?: string
  networkId?: NetworkId | null
}

const NetworkLogoInner: FC<NetworkLogoProps> = ({ networkId: id, className }) => {
  const network = useNetworkById(id)

  return <NetworkLogoBase network={network} className={className} />
}

const NetworkLogoFallback: FC<{ className?: string }> = ({ className }) => (
  <div
    className={classNames(
      "block! h-[1em] w-[1em] shrink-0 overflow-hidden rounded-full bg-body-disabled!",
      className
    )}
  ></div>
)

export const NetworkLogo: FC<NetworkLogoProps> = (props) => (
  <Suspense fallback={<NetworkLogoFallback className={props.className} />}>
    <NetworkLogoInner {...props} />
  </Suspense>
)
