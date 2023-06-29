import { TokenId } from "@talismn/chaindata-provider"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { FC } from "react"
import { Trans, useTranslation } from "react-i18next"

export const SignViewStakingStake: FC<{
  planck: bigint
  tokenId: TokenId
  autoCompound?: number
}> = ({ planck, tokenId, autoCompound }) => {
  const { t } = useTranslation("request")
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div>{t("You are staking")}</div>
      <div className="text-body flex items-center gap-2">
        <TokenLogo tokenId={tokenId} className="inline h-[1em] w-[1em]" />{" "}
        <TokensAndFiat planck={planck} tokenId={tokenId} noCountUp />
      </div>
      {!!autoCompound && (
        <Trans t={t}>
          <div>
            with <span className="text-body">{autoCompound}%</span> of rewards
          </div>
          <div>auto-compounding</div>
        </Trans>
      )}
    </div>
  )
}
