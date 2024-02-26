import { IS_FIREFOX, UNKNOWN_TOKEN_URL } from "@core/constants"
import { TokenId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import useToken from "@ui/hooks/useToken"
import { FC, Suspense, useCallback, useEffect, useMemo, useState } from "react"

const isTalismanLogo = (url?: string | null) => {
  if (!url) return false
  return (
    /^https:\/\/raw.githubusercontent.com\/TalismanSociety\/chaindata\//i.test(url) &&
    !/assets\/tokens\/coingecko/i.test(url)
  )
}

type AssetLogoBaseProps = {
  id?: string
  className?: string
  url?: string | null
  rounded?: boolean
}

export const AssetLogoBase = ({ id, className, url, rounded }: AssetLogoBaseProps) => {
  const [src, setSrc] = useState(() => url ?? UNKNOWN_TOKEN_URL)

  // reset
  useEffect(() => {
    setSrc(url ?? UNKNOWN_TOKEN_URL)
  }, [url])

  const handleError = useCallback(() => setSrc(UNKNOWN_TOKEN_URL), [])

  const imgClassName = useMemo(
    () =>
      classNames(
        "relative block w-[1em] shrink-0 aspect-square",
        rounded && "rounded-full",
        className
      ),
    [className, rounded]
  )

  // use url as key to reset dom element in case url changes, otherwise onError can't fire again
  return (
    <img
      key={url ?? id ?? "EMPTY"}
      data-id={id}
      src={src}
      className={imgClassName}
      alt=""
      crossOrigin={IS_FIREFOX ? undefined : "anonymous"}
      loading="lazy" // defers download, helps performance especially in token pickers
      onError={handleError}
    />
  )
}

type AssetLogoProps = {
  className?: string

  // for tokens which are in our tokens store, we can just reference them
  // by id and this component will fetch their logo from our chaindata
  id?: TokenId
}

const AssetLogoInner: FC<AssetLogoProps> = ({ className, id }) => {
  const token = useToken(id)

  // round logos except if they are hosted in Talisman's chaindata repo
  const rounded = useMemo(() => !isTalismanLogo(token?.logo), [token?.logo])

  return <AssetLogoBase className={className} url={token?.logo} rounded={rounded} />
}

const AssetLogoFallback: FC<{ className?: string }> = ({ className }) => (
  <div
    className={classNames(
      "!bg-body-disabled !block h-[1em] w-[1em] shrink-0 overflow-hidden rounded-full",
      className
    )}
  ></div>
)

export const AssetLogo: FC<AssetLogoProps> = (props) => (
  <Suspense fallback={<AssetLogoFallback className={props.className} />}>
    <AssetLogoInner {...props} />
  </Suspense>
)
