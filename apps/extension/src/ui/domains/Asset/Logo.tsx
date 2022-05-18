import styled from "styled-components"

interface IAssetLogo {
  id: string
  className?: string
}

const backgroundUrl = (chainId: string) =>
  `url(https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/${chainId}/logo.svg)`

const AssetLogo = ({ id, className }: IAssetLogo) => {
  return (
    <div
      className={`${className} chain-logo`}
      style={{ backgroundImage: backgroundUrl(id) }}
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
