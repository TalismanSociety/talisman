import type { Token } from "@talismn/chaindata-provider"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

export const AssetPill: FC<{ token: Token | null }> = ({ token }) => {
  const { t } = useTranslation()

  if (!token) return null

  return (
    <div className="flex h-16 items-center gap-4 px-4">
      <TokenLogo tokenId={token.id} className="shrink-0 text-lg" />
      <div className="flex items-center gap-2">
        <div className="text-base text-body">{token.symbol}</div>
        <div className="inline-block size-2 rounded-full bg-body-disabled"></div>
        <div className="text-body-secondary text-sm">{t("Delegated Staking")}</div>
      </div>
    </div>
  )
}
