import { Token } from "@core/domains/tokens/types"
import { log } from "@core/log"
import genericTokenSvgIcon from "@talisman/theme/icons/custom-token-generic.svg?url"
import useToken from "@ui/hooks/useToken"
import { imgSrcToBlob } from "blob-util"
import { CSSProperties, FC, memo, useEffect, useMemo, useState } from "react"
import styled from "styled-components"
import { getBase64ImageUrl } from "talisman-utils"

export const GENERIC_TOKEN_LOGO_URL = getBase64ImageUrl(genericTokenSvgIcon)

// cache token logo urls, because some of them (erc20) are base64 that we want to convert to object url only once
const tokenLogoUrlCache = new Map<string, string | null>()

const getSafeTokenLogoUrl = async (imageUrl?: string | null) => {
  if (imageUrl) {
    try {
      const blob = await imgSrcToBlob(imageUrl, undefined, "anonymous")
      return URL.createObjectURL(blob)
    } catch (err) {
      // happens in firefox if there is an svg formatting error.
      // in such case image can be displayed from url, and most importantly, it exists.
      if (err instanceof TypeError) return imageUrl

      // ignore, there could be many reasons
      // fallback to generic token
    }
  }
  return GENERIC_TOKEN_LOGO_URL
}

const getUnsafeChainLogoUrl = (chainId?: string | number) => {
  if (chainId === undefined) return null
  return `https://raw.githubusercontent.com/TalismanSociety/chaindata/feat/split-entities/assets/${chainId}/logo.svg`
}

const Logo = styled.div`
  width: 1em;
  height: 1em;
  border-radius: 50%;
  background-size: cover;
  background-position: 50% 50%;
  background-repeat: no-repeat;
`

export const getTokenLogoUrl = (token?: Token) => {
  // TODO better typing
  if (token?.type === "erc20") {
    const { isCustom, image } = token as { isCustom?: boolean; image?: string }
    return image ?? (isCustom ? null : getUnsafeChainLogoUrl(token?.evmNetwork?.id))
  } else if (token && ["native", "orml"].includes(token.type)) {
    const { chain, evmNetwork } = token as { chain?: { id: string }; evmNetwork?: { id: number } }
    return getUnsafeChainLogoUrl(chain?.id ?? evmNetwork?.id)
  }
  return null
}

type TokenImageProps = { src?: string | null; className?: string }

export const TokenImage: FC<TokenImageProps> = memo(({ src, className }) => {
  // we don't want this to flicker while image url is loading, so allow for empty background
  const style: CSSProperties = useMemo(() => {
    return src
      ? {
          backgroundImage: `url(${src})`,
        }
      : {}
  }, [src])

  return <Logo className={className} style={style} />
})

export type TokenLogoProps = {
  tokenId?: string
  className?: string
}

// generic token logo component, supports all token types
export const TokenLogo = ({ tokenId, className }: TokenLogoProps) => {
  const token = useToken(tokenId)
  const [imageUrl, setImageUrl] = useState(
    //if token id is defined pull from cache, but if not, wait result from getSafeTokenLogoUrl
    () =>
      tokenId ? (tokenLogoUrlCache.has(tokenId) ? tokenLogoUrlCache.get(tokenId) : undefined) : null
  )

  useEffect(() => {
    if (!token) return

    if (!tokenLogoUrlCache.has(token.id)) {
      if ("image" in token && token.image) {
        tokenLogoUrlCache.set(token.id, token.image)
        setImageUrl(token.image)
      } else {
        const tokenLogoUrl = getTokenLogoUrl(token)

        // will fallback to generic token logo if not found
        getSafeTokenLogoUrl(tokenLogoUrl).then((safeTokenLogoUrl) => {
          tokenLogoUrlCache.set(token.id, safeTokenLogoUrl)
          setImageUrl(safeTokenLogoUrl)
        })
      }
    }
  }, [token])

  return <TokenImage src={imageUrl} className={className} />
}
