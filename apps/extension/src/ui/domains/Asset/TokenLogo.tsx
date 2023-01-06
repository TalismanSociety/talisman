import { AssetLogo } from "@ui/domains/Asset/AssetLogo"

export type TokenLogoProps = {
  tokenId?: string
  className?: string
}

export const TokenLogo = ({ className, tokenId }: TokenLogoProps) => (
  <AssetLogo className={className} id={tokenId} />
)
