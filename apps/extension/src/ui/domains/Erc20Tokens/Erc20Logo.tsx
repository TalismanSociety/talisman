import { useCustomErc20Token } from "@ui/hooks/useCustomErc20Token"
import styled from "styled-components"
import unknownToken from "@talisman/theme/icons/custom-token-generic.svg"
import { classNames } from "@talisman/util/classNames"

const TokenLogoImg = styled.img`
  //defaults to font size
  width: 1em;
  height: 1em;
`

type Erc20LogoProps = {
  id?: string
  className?: string
}

export const Erc20Logo = ({ id, className }: Erc20LogoProps) => {
  const { token } = useCustomErc20Token(id)

  return (
    <TokenLogoImg
      className={classNames("erc20-token", className)}
      src={token?.image ?? unknownToken}
      alt={token?.symbol}
    />
  )
}
