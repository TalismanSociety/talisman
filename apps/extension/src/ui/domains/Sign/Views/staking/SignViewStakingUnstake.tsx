import { TokenId } from "@talismn/chaindata-provider"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import useToken from "@ui/hooks/useToken"
import { FC } from "react"
import { useTranslation } from "react-i18next"

export const SignViewStakingUnstake: FC<{
  tokenId: TokenId
}> = ({ tokenId }) => {
  const { t } = useTranslation("request")
  const token = useToken(tokenId)

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div>
        {t("You are unbonding all")}{" "}
        <span className="text-body inline-flex gap-2">
          <TokenLogo tokenId={tokenId} className="inline" />
          <span>{token?.symbol}</span>
        </span>
      </div>
    </div>
  )
}
