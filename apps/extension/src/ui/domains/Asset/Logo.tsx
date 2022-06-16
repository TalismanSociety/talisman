import styled from "styled-components"
import CustomTokenGeneric from "@talisman/theme/icons/custom-token-generic.svg"
import { getBase64ImageUrl } from "talisman-utils"

const genericTokenUrl = getBase64ImageUrl(CustomTokenGeneric)

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
      style={{ backgroundImage: `url(${background(id)}), url(${genericTokenUrl})` }}
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
