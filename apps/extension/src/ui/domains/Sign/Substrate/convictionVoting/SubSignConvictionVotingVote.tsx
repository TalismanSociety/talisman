import { Conviction } from "@polkadot/types/interfaces/democracy"
import { SignViewIconHeader } from "@ui/domains/Ethereum/Sign/views/SignViewIconHeader"
import { SignViewVotingVote } from "@ui/domains/Ethereum/Sign/views/staking/SignViewVotingVote"
import { useExtrinsic } from "@ui/hooks/useExtrinsic"
import { useMemo } from "react"

import { SignContainer } from "../../SignContainer"
import { usePolkadotSigningRequest } from "../../SignRequestContext"

const getConviction = (conviction?: Conviction) => {
  switch (conviction?.type) {
    case "Locked1x":
      return 1
    case "Locked2x":
      return 2
    case "Locked3x":
      return 3
    case "Locked4x":
      return 4
    case "Locked5x":
      return 5
    case "Locked6x":
      return 6
    case "None":
    default:
      return 0
  }
}

export const SubSignConvictionVotingVote = () => {
  const { chain, payload } = usePolkadotSigningRequest()
  const { data: extrinsic } = useExtrinsic(payload)

  const { pollIndex, title, conviction, voteAmount } = useMemo(() => {
    const vote = extrinsic?.registry.createType(
      "PalletConvictionVotingVoteAccountVote",
      extrinsic?.method?.args[1]
    )

    return {
      pollIndex: extrinsic?.method?.args[0]?.toPrimitive() as number,
      title: vote?.asStandard?.vote.isAye ? "Vote Yes" : "Vote No",
      conviction: getConviction(vote?.asStandard?.vote.conviction as Conviction),
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
      <SignViewVotingVote
        tokenId={chain.nativeToken.id}
        conviction={conviction}
        voteAmount={voteAmount}
        pollIndex={pollIndex}
      />
    </SignContainer>
  )
}
