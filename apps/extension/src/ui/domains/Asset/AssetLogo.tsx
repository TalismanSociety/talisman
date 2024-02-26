import { IS_FIREFOX, UNKNOWN_TOKEN_URL } from "@core/constants"
import { getCoinGeckoErc20Coin } from "@core/util/coingecko/getCoinGeckoErc20Coin"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { TokenId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import useToken from "@ui/hooks/useToken"
import { isCustomErc20Token } from "@ui/util/isCustomErc20Token"
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

  // for tokens which are not in our tokens store, we need the networkId
  // and contractAddress in order to fetch their logo from coingecko's api
  erc20?: CoingeckoLogoRequest
}

const AssetLogoInner: FC<AssetLogoProps> = ({ className, id, erc20 }) => {
  const token = useToken(id)

  const { data: erc20TokenLogo } = useErc20TokenImage(erc20)

  // extract the token logo url, or use the unknown logo url
  const logo = useMemo(() => {
    return (
      // if the token is a custom erc20 token, try the token.image field first
      (isCustomErc20Token(token) ? token.image : undefined) ??
      // next, try the token.logo field
      token?.logo ??
      // next, try the erc20TokenLogo
      erc20TokenLogo
    )
  }, [erc20TokenLogo, token])

  // round logos except if they are hosted in Talisman's chaindata repo
  const rounded = useMemo(() => !isTalismanLogo(logo), [logo])

  return <AssetLogoBase className={className} url={logo} rounded={rounded} />
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

//
// coingecko logo url helpers
//
export type CoingeckoLogoRequest = { evmNetworkId: EvmNetworkId; contractAddress: string }

const useErc20TokenImage = (
  erc20: CoingeckoLogoRequest | undefined,
  iconSize: "thumb" | "small" | "large" = "small"
) => {
  return useQuery({
    queryKey: ["useErc20TokenImage", erc20],
    queryFn: async () => {
      if (!erc20) return null
      const data = await getCoinGeckoErc20Coin(erc20.evmNetworkId, erc20.contractAddress)
      if (!data) return null
      return data.image[iconSize]
    },
    retry: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })
}
