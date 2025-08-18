import { classNames } from "@talismn/util"
import { IS_FIREFOX, UNKNOWN_TOKEN_URL } from "extension-shared"
import { CSSProperties, FC, useId, useMemo } from "react"

import { useGithubImageUrl } from "@ui/hooks/useGithubImageUrl"

const isTalismanLogo = (url?: string | null) => {
  if (!url) return false
  return (
    /^https:\/\/raw.githubusercontent.com\/TalismanSociety\/chaindata\//i.test(url) &&
    !/assets\/tokens\/coingecko/i.test(url) &&
    !/assets\/tokens\/vana/i.test(url)
  )
}

export const AssetLogo: FC<{
  tokenId?: string
  className?: string
  style?: CSSProperties
  url?: string | null
}> = ({ tokenId, className, style, url }) => {
  const rid = useId()
  const rounded = useMemo(() => !isTalismanLogo(url), [url])
  const { src, onError } = useGithubImageUrl(url, UNKNOWN_TOKEN_URL)

  // use url as key to reset dom element in case url changes, otherwise onError can't fire again
  return (
    <img
      key={`${rid}::${src}`}
      data-id={tokenId}
      src={src}
      className={classNames(
        "relative block aspect-square w-[1em] shrink-0",
        rounded && "rounded-full",
        className,
      )}
      style={style}
      alt=""
      crossOrigin={IS_FIREFOX ? undefined : "anonymous"}
      loading="lazy" // defers download, helps performance especially in token pickers
      onError={onError}
    />
  )
}
