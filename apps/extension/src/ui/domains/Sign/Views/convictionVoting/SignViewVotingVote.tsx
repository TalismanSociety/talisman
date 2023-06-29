import { TokenId } from "@talismn/chaindata-provider"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { FC } from "react"
import { useTranslation } from "react-i18next"

export const SignViewVotingVote: FC<{
  voteAmount: bigint
  tokenId: TokenId
  pollIndex: number
  conviction: number
}> = ({ voteAmount, tokenId, pollIndex, conviction }) => {
  const { t } = useTranslation("request")
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between">
        <div>{t("Referenda")}</div>
        <div className="text-body">#{pollIndex}</div>
      </div>
      <div className="flex w-full items-center justify-between">
        <div>{t("Deposit")}</div>
        <div className="text-body">
          <TokenLogo tokenId={tokenId} className="inline h-[1em] w-[1em]" />{" "}
          <TokensAndFiat planck={voteAmount} tokenId={tokenId} noCountUp />
        </div>
      </div>
      <div className="flex w-full items-center justify-between">
        <div>{t("Conviction")}</div>
        <div className="text-body">{conviction === 0 ? "0.1" : conviction}X</div>
      </div>
    </div>
  )
}
