import styled from "styled-components"
import { GENERIC_TOKEN_LOGO_URL } from "./TokenLogo"

interface IAssetLogo {
  id?: string | number
  className?: string
}

const background = (chainId?: string | number) =>
  `https://raw.githubusercontent.com/TalismanSociety/chaindata/feat/split-entities/assets/${chainId}/logo.svg`

const AssetLogo = ({ id, className }: IAssetLogo) => {
  return (
    <div
      className={`${className} chain-logo`}
      style={{ backgroundImage: `url(${background(id)}), url(${GENERIC_TOKEN_LOGO_URL})` }}
      data-id={id}
    />
  )
}

const StyledAssetLogo = styled(AssetLogo)`
  display: block;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  border-radius: 50%;
  background-size: cover;
  background-position: 50% 50%;
  background-repeat: no-repeat;
`

export default StyledAssetLogo
