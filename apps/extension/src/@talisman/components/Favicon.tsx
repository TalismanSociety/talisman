import { useFaviconUrl } from "@ui/hooks/useFaviconUrl"
import styled from "styled-components"

interface IProps {
  url: string
  large?: boolean
  small?: boolean
  className?: string
}

const Favicon = ({ url, className }: IProps) => {
  const iconUrl = useFaviconUrl(url)

  return (
    <span className={`favicon ${className}`}>
      {!!iconUrl && (
        <img loading="lazy" src={iconUrl} crossOrigin="anonymous" alt={`favicon ${url}`} />
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
