import { Token } from "@core/domains/tokens/types"
import { log } from "@core/log"
import genericTokenSvgIcon from "@talisman/theme/icons/custom-token-generic.svg?url"
import useToken from "@ui/hooks/useToken"
import { CSSProperties, useEffect, useMemo, useState } from "react"
import styled from "styled-components"
import { getBase64ImageUrl } from "talisman-utils"

const genericTokenIconUrl = getBase64ImageUrl(genericTokenSvgIcon)

// cache token logo urls, because some of them (erc20) are base64 that we want to convert to object url only once
const tokenLogoUrlCache = new Map<string, string | null>()

const Logo = styled.div`
  width: 1em;
  height: 1em;
  border-radius: 50%;
  background-size: cover;
  background-position: 50% 50%;
  background-repeat: no-repeat;
`

export type TokenLogoProps = {
  tokenId?: string
  className?: string
}

const getChainLogoUrl = (chainId?: string | number) => {
  if (chainId === undefined) return null
  return `https://raw.githubusercontent.com/TalismanSociety/chaindata/feat/split-entities/assets/${chainId}/logo.svg`
}

const getTokenLogoUrl = (token?: Token) => {
  if (token?.type === "erc20") {
    const { isCustom, image } = token as { isCustom?: boolean; image?: string }
    return image ?? (isCustom ? null : getChainLogoUrl(token?.evmNetwork?.id))
  } else if (token && ["native", "orml"].includes(token.type)) {
    const { chain, evmNetwork } = token as { chain?: { id: string }; evmNetwork?: { id: number } }
    return getChainLogoUrl(chain?.id ?? evmNetwork?.id)
  }
  return null
}

// generic token logo component, supports all token types
export const TokenLogo = ({ tokenId, className }: TokenLogoProps) => {
  const token = useToken(tokenId)
  const [imageUrl, setImageUrl] = useState(
    //if token id is defined pull from cache, but if not, set null to fallback to generic token
    tokenId ? (tokenLogoUrlCache.has(tokenId) ? tokenLogoUrlCache.get(tokenId) : undefined) : null
  )

  useEffect(() => {
    if (!token) return

    if (!tokenLogoUrlCache.has(token.id)) {
      const tokenLogoUrl = getTokenLogoUrl(token)
      try {
        const url = tokenLogoUrl?.startsWith("data:")
          ? getBase64ImageUrl(tokenLogoUrl)
          : tokenLogoUrl
        tokenLogoUrlCache.set(token.id, url)
      } catch (err) {
        tokenLogoUrlCache.set(token.id, genericTokenIconUrl)
        log.log("Failed to load token for %s", token.id)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    setImageUrl(tokenLogoUrlCache.get(token.id)!)
  }, [token])

  const style: CSSProperties | undefined = useMemo(() => {
    return imageUrl !== undefined
      ? {
          backgroundImage: [imageUrl, genericTokenIconUrl]
            .filter(Boolean)
            .map((url) => `url(${url})`)
            .join(", "),
        }
      : undefined
  }, [imageUrl])

  return <Logo className={className} style={style} />
}
