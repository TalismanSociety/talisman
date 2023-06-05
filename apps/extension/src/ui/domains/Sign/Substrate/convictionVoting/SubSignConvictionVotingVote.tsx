import { SignViewVotingVote } from "@ui/domains/Sign/Views/convictionVoting/SignViewVotingVote"
import { SignViewIconHeader } from "@ui/domains/Sign/Views/SignViewIconHeader"
import { useExtrinsic } from "@ui/hooks/useExtrinsic"
import { useMemo } from "react"

import { SignContainer } from "../../SignContainer"
import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { getConviction } from "./getConviction"

export const SubSignConvictionVotingVote = () => {
  const { chain, payload } = usePolkadotSigningRequest()
  const { data: extrinsic } = useExtrinsic(payload)

  const { title, ...props } = useMemo(() => {
    const vote = extrinsic?.registry.createType(
      "PalletConvictionVotingVoteAccountVote",
      extrinsic?.method?.args[1]
    )

    return {
      title: vote?.asStandard?.vote.isAye ? "Vote Yes" : "Vote No",
      pollIndex: extrinsic?.method?.args[0]?.toPrimitive() as number,
      conviction: getConviction(vote?.asStandard?.vote.conviction),
      voteAmount: vote?.asStandard?.balance.toBigInt() ?? 0n,
    }
  }, [extrinsic])

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
