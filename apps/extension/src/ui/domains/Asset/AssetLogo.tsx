import { log } from "@core/log"
import { getCoinGeckoErc20Coin } from "@core/util/coingecko/getCoinGeckoErc20Coin"
import { classNames } from "@talisman/util/classNames"
import { EvmNetworkId, githubUnknownTokenLogoUrl } from "@talismn/chaindata-provider"
import { TokenId } from "@talismn/chaindata-provider"
import useToken from "@ui/hooks/useToken"
import { imgSrcToBlob } from "blob-util"
import { FC, useEffect, useState } from "react"

type AssetLogoBaseProps = {
  id?: string
  className?: string
  url?: string | null
  symbol?: string
}

export const AssetLogoBase = ({ id, symbol, className, url }: AssetLogoBaseProps) => {
  const [error, setError] = useState(false)

  useEffect(() => {
    setError(false)
  }, [url])

  return (
    <picture
      className={classNames(
        //"asset-logo", // TODO verify it's not needed
        "relative block h-[1em] w-[1em] shrink-0",
        className
      )}
    >
      {!url || error ? (
        <source srcSet={githubUnknownTokenLogoUrl} />
      ) : (
        <source srcSet={url ?? undefined} />
      )}
      <img
        className="absolute top-0 left-0 h-full w-full"
        src={githubUnknownTokenLogoUrl}
        alt={symbol ?? ""}
        data-id={id}
        onError={() => setError(true)}
      />
    </picture>
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

export const AssetLogo: FC<AssetLogoProps> = ({ className, id, erc20 }) => {
  const token = useToken(id)

  // extract the token logo url, or use the unknown logo url
  const logo =
    //
    // if the token is a custom erc20 token, try the token.image field first
    //
    (token && token.type === "evm-erc20" && "isCustom" in token && token.isCustom
      ? token.image
      : undefined) ??
    //
    // next, try the token.logo field
    //
    token?.logo ??
    //
    // next, use the unknown token logo as a fallback
    //
    githubUnknownTokenLogoUrl

  // for coingecko/data token logo urls, run some async transforms on the url
  //
  // if we've already run the transforms before, fetch the url result from the cache
  // otherwise, set url to `undefined` for now while we wait for the results
  const [url, setUrl] = useState(
    (() => {
      // `coingecko` token logo urls
      if (erc20) {
        const cacheId = coingeckoCacheId(erc20)
        return coingeckoLogoUrlCache.has(cacheId) ? coingeckoLogoUrlCache.get(cacheId) : undefined
      }

      // `data:` token logo urls
      if (id && logo.startsWith("data:")) {
        const cacheId = id
        return dataLogoUrlCache.has(cacheId) ? dataLogoUrlCache.get(cacheId) : undefined
      }

      // if not a `coingecko` or `data:` url, we don't need to run any async transforms, just use the logo as-is
      return logo
    })()
  )

  // run the async transforms, if necessary
  useEffect(() => {
    // `coingecko` token logo urls
    if (erc20) {
      const cacheId = coingeckoCacheId(erc20)
      if (coingeckoLogoUrlCache.has(cacheId)) return setUrl(coingeckoLogoUrlCache.get(cacheId))

      // fetch coingecko url for coingecko token logo
      getCoingeckoLogoUrl(erc20).then((url) => {
        coingeckoLogoUrlCache.set(cacheId, url)
        setUrl(url)
      })
      return
    }

    // `data:` token logo urls
    if (id && logo.startsWith("data:")) {
      const cacheId = id
      if (dataLogoUrlCache.has(cacheId)) return setUrl(dataLogoUrlCache.get(cacheId))

      // generate blob url for `data:xxxx` token logo
      getDataLogoUrl(id, logo).then((url) => {
        dataLogoUrlCache.set(id, url)
        setUrl(url)
      })
      return
    }

    // all other token logo urls
    setUrl(logo)
  }, [erc20, id, logo])

  return <AssetLogoBase className={className} symbol={token?.symbol} url={url} />
}

//
// coingecko logo url helpers
//

export type CoingeckoLogoRequest = { evmNetworkId: EvmNetworkId; contractAddress: string }

// cache coingecko token logo urls
const coingeckoLogoUrlCache = new Map<string, string>()
const coingeckoCacheId = (erc20: CoingeckoLogoRequest) =>
  `${erc20.evmNetworkId}-${erc20.contractAddress}`

// Given a networkId and an erc20 contractAddress, this function will fetch an return a url to that erc20 token's logo
const getCoingeckoLogoUrl = async (
  erc20: CoingeckoLogoRequest,
  iconSize: "thumb" | "small" | "large" = "small"
) => {
  if (erc20.evmNetworkId && erc20.contractAddress) {
    const data = await getCoinGeckoErc20Coin(erc20.evmNetworkId, erc20.contractAddress)

    if (data) {
      try {
        const blob = await imgSrcToBlob(data.image[iconSize], undefined, "anonymous")
        return URL.createObjectURL(blob)
      } catch (error) {
        // ignore, there could be many reasons
        // fallback to generic token
        log.warn(
          `Failed to create url for token on network ${erc20.evmNetworkId} with address ${erc20.contractAddress}`,
          error
        )
      }
    }
  }
  return githubUnknownTokenLogoUrl
}

//
// data: logo url helpers
//

// cache token logo urls, because some of them (evm-erc20) are base64 that we want to convert to object url only once
const dataLogoUrlCache = new Map<string, string | null>()

// Given an imageUrl which begins with `data:`, this function will create a Blob
// and return an ObjectURL which references this Blob.
const getDataLogoUrl = async (tokenId: string, imageUrl: string) => {
  if (imageUrl) {
    try {
      const blob = await imgSrcToBlob(imageUrl, undefined, "anonymous")
      return URL.createObjectURL(blob)
    } catch (error) {
      // happens in firefox if there is an svg formatting error.
      // in such case image can be displayed from url, and most importantly, it exists.
      if (error instanceof TypeError) return imageUrl

      // ignore, there could be many reasons
      // fallback to generic token
      log.warn(`Failed to create url for token ${tokenId}`, error)
    }
  }
  return githubUnknownTokenLogoUrl
}
