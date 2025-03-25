import { AssetLogo } from "@ui/domains/Asset/AssetLogo"

export type TokenLogoProps = {
  tokenId?: string
  className?: string
  url?: string | null
}

export const TokenLogo = ({ className, tokenId, url }: TokenLogoProps) => (
  <AssetLogo className={className} id={url ? undefined : tokenId} url={url} />
)
