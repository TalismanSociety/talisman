import { SignViewVotingVote } from "@ui/domains/Sign/Views/convictionVoting/SignViewVotingVote"
import { SignViewIconHeader } from "@ui/domains/Sign/Views/SignViewIconHeader"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignContainer } from "../../SignContainer"
import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { getConviction } from "./getConviction"

export const SubSignConvictionVotingVote = () => {
  const { t } = useTranslation("request")
  const { chain, extrinsic } = usePolkadotSigningRequest()

  const { title, ...props } = useMemo(() => {
    const vote = extrinsic?.registry.createType(
      "PalletConvictionVotingVoteAccountVote",
      extrinsic?.method?.args[1]
    )

    return {
      title: vote?.asStandard?.vote.isAye ? t("Vote Yes") : t("Vote No"),
      pollIndex: extrinsic?.method?.args[0]?.toPrimitive() as number,
      conviction: getConviction(vote?.asStandard?.vote.conviction),
      voteAmount: vote?.asStandard?.balance.toBigInt() ?? 0n,
    }
  }, [extrinsic, t])

  if (!chain?.nativeToken) return null

  return (
    <SignContainer
      networkType="substrate"
      title={title}
      header={<SignViewIconHeader icon="vote" />}
    >
      <SignViewVotingVote tokenId={chain.nativeToken.id} {...props} />
    </SignContainer>
  )
}
