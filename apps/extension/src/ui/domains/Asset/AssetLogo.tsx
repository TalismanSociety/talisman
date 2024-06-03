import { IS_FIREFOX, UNKNOWN_TOKEN_URL } from "@extension/shared"
import { evmErc20TokenId } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import useToken from "@ui/hooks/useToken"
import { CSSProperties, FC, Suspense, useCallback, useEffect, useMemo, useState } from "react"

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
  style?: CSSProperties
  url?: string | null
  rounded?: boolean
}

export const AssetLogoBase = ({ id, className, style, url, rounded }: AssetLogoBaseProps) => {
  const [src, setSrc] = useState(() => url ?? UNKNOWN_TOKEN_URL)

  // reset
  useEffect(() => {
    setSrc(url ?? UNKNOWN_TOKEN_URL)
  }, [url])

  const handleError = useCallback(() => setSrc(UNKNOWN_TOKEN_URL), [])

  const imgClassName = useMemo(
    () =>
      classNames(
        "relative block aspect-square w-[1em] shrink-0",
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
      style={style}
      alt=""
      crossOrigin={IS_FIREFOX ? undefined : "anonymous"}
      loading="lazy" // defers download, helps performance especially in token pickers
      onError={handleError}
    />
  )
}

const LpAssetLogo = ({ className, id }: { className?: string; id?: TokenId }) => {
  const lpToken = useToken(id)
  const tokenId0 =
    lpToken?.type === "evm-uniswapv2"
      ? evmErc20TokenId(lpToken?.evmNetwork?.id ?? "", lpToken?.tokenAddress0)
      : null
  const tokenId1 =
    lpToken?.type === "evm-uniswapv2"
      ? evmErc20TokenId(lpToken?.evmNetwork?.id ?? "", lpToken?.tokenAddress1)
      : null
  const token0 = useToken(tokenId0)
  const token1 = useToken(tokenId1)

  return (
    <div className={classNames("relative block aspect-square w-[1em] shrink-0", className)}>
      <AssetLogoBase
        className="absolute h-full w-full"
        url={token0?.logo}
        style={{ clipPath: "polygon(0% 0%, 48% 0%, 48% 100%, 0% 100%)" }}
      />
      <AssetLogoBase
        className="absolute h-full w-full"
        url={token1?.logo}
        style={{ clipPath: "polygon(100% 0%, 52% 0%, 52% 100%, 100% 100%)" }}
      />
    </div>
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

  // special logos for LP tokens
  if (token?.type === "evm-uniswapv2") return <LpAssetLogo className={className} id={id} />

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
