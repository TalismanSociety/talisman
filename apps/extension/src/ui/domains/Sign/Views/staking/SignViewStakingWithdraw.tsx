import { TokenId } from "@talismn/chaindata-provider"
import { FC } from "react"
import { useTranslation } from "react-i18next"

import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { useToken } from "@ui/state"

export const SignViewStakingWithdraw: FC<{
  tokenId: TokenId
}> = ({ tokenId }) => {
  const { t } = useTranslation("request")
  const token = useToken(tokenId)

  return (
    <div>
      <div className="leading-paragraph">
        <span className="align-middle">{t("You are withdrawing your unbonded")} </span>
        <span className="text-body inline-flex items-center gap-2 align-bottom">
          <TokenLogo tokenId={tokenId} className="inline shrink-0" />
          <span>{token?.symbol}</span>
        </span>
      </div>
    </div>
  )
}
