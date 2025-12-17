import { Token } from "@talismn/chaindata-provider"
import { FC } from "react"
import { useTranslation } from "react-i18next"

import { TokenLogo } from "@ui/domains/Asset/TokenLogo"

export const AssetPill: FC<{ token: Token | null }> = ({ token }) => {
  const { t } = useTranslation()

  if (!token) return null

  return (
    <div className="flex h-16 items-center gap-4 px-4">
      <TokenLogo tokenId={token.id} className="shrink-0 text-lg" />
      <div className="flex items-center gap-2">
        <div className="text-body text-base">{token.symbol}</div>
        <div className="bg-body-disabled inline-block size-2 rounded-full"></div>
        <div className="text-body-secondary text-sm">{t("Delegated Staking")}</div>
      </div>
    </div>
  )
}
