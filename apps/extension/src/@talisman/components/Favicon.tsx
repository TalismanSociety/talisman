import { UNKNOWN_NETWORK_URL } from "@core/constants"
import { useFaviconUrl } from "@ui/hooks/useFaviconUrl"
import { useCallback, useEffect, useState } from "react"
import styled from "styled-components"

const IS_FIREFOX = navigator.userAgent.toLowerCase().includes("firefox")

interface IProps {
  url: string
  large?: boolean
  small?: boolean
  className?: string
}

const Favicon = ({ url, className }: IProps) => {
  const iconUrl = useFaviconUrl(url)
  const [src, setSrc] = useState(() => iconUrl)

  useEffect(() => {
    setSrc(iconUrl)
  }, [iconUrl])

  // fallback to the globe icon if image can't be loaded
  const handleError = useCallback(() => setSrc(UNKNOWN_NETWORK_URL), [])

  return (
    <span className={`favicon ${className}`}>
      {!!iconUrl && (
        <img
          loading="lazy"
          src={src}
          alt=""
          // required for chrome to work around the manifest rule, but breaks firefox as it enforces CORS
          crossOrigin={IS_FIREFOX ? undefined : "anonymous"}
          onError={handleError}
        />
      )}
    </span>
  )
}

const StyledFavicon = styled(Favicon)`
  border-radius: 50%;
  background: var(--color-background);
  width: 3.2rem;
  min-width: 3.2rem;
  height: 3.2rem;
  display: block;
  position: relative;

  > img {
    width: 2.6rem;
    min-width: 2.6rem;
    height: 2.6rem;
    position: absolute;
    top: 0.3rem;
    left: 0.3rem;
  }

  ${({ large }) =>
    large &&
    `
    width: 4rem;
    min-width: 4rem;
    height: 4rem;
    >img{
      width: 3.4rem;
      min-width: 3.4rem;
      height: 3.4rem;
    }
  `}

  ${({ small }) =>
    small &&
    `
    width: 2.4rem;
    min-width: 2.4rem;
    height: 2.4rem;
    >img{
      width: 1.8rem;
      min-width: 1.8rem;
      height: 1.8rem;
    }
  `}
`

export default StyledFavicon
