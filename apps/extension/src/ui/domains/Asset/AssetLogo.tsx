import { classNames } from "@talisman/util/classNames"
import { githubUnknownTokenLogoUrl } from "@talismn/chaindata-provider"
import { TokenId } from "@talismn/chaindata-provider"
import { getBase64ImageUrl } from "@talismn/util"
import useToken from "@ui/hooks/useToken"
import { useState } from "react"
import styled from "styled-components"

// cache token logo urls, because some of them (evm-erc20) are base64 that we want to convert to object url only once
const tokenLogoUrlCache = new Map<string, string | null>()

type AssetLogoProps = {
  className?: string
  id?: TokenId
}

export const AssetLogo = styled(({ id, className }: AssetLogoProps) => {
  const token = useToken(id)
  const logo =
    token && "isCustom" in token && token.isCustom && token.type === "evm-erc20"
      ? token.image ?? token.logo
      : token?.logo ?? githubUnknownTokenLogoUrl

  const url =
    id && logo.startsWith("data:")
      ? tokenLogoUrlCache.has(id)
        ? tokenLogoUrlCache.get(id)
        : tokenLogoUrlCache.set(id, getBase64ImageUrl(logo)).get(id)
      : logo

  const [error, setError] = useState(false)

  return (
    <picture>
      {error ? <source srcSet={githubUnknownTokenLogoUrl} /> : <source srcSet={url ?? undefined} />}
      <img
        className={classNames("asset-logo", className)}
        src={githubUnknownTokenLogoUrl}
        alt={token?.symbol}
        data-id={id}
        onError={() => setError(true)}
      />
    </picture>
  )
})`
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
