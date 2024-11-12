import { PolkadotCalls, VotingConviction } from "papi-descriptors"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignViewVotingVote } from "@ui/domains/Sign/Views/convictionVoting/SignViewVotingVote"
import { SignViewIconHeader } from "@ui/domains/Sign/Views/SignViewIconHeader"
import { useChainByGenesisHash } from "@ui/state"

import { SignContainer } from "../../SignContainer"
import { SignViewVotingDelegate } from "../../Views/convictionVoting/SignViewVotingDelegate"
import { SignViewVotingUndelegate } from "../../Views/convictionVoting/SignViewVotingUndelegate"
import { SubSignBodyDefault } from "../SubSignBodyDefault"
import { DecodedCallComponent, DecodedCallComponentDefs } from "../types"
import { decodeStandardVote } from "../util/decodeStandardVote"
import { getAddressFromMultiAddress } from "../util/getAddressFromMultiAddress"

const Vote: DecodedCallComponent<PolkadotCalls["ConvictionVoting"]["vote"]> = ({
  decodedCall,
  payload,
}) => {
  const { t } = useTranslation("request")
  const chain = useChainByGenesisHash(payload.genesisHash)

  const props = useMemo(() => {
    if (!chain) throw new Error("chain not found")

    if (decodedCall.args.vote.type === "Standard") {
      const { isAye, conviction } = decodeStandardVote(decodedCall.args.vote.value.vote)

      return {
        title: isAye ? t("Vote Yes") : t("Vote No"),
        pollIndex: decodedCall.args.poll_index,
        conviction,
        voteAmount: decodedCall.args.vote.value.balance,
      }
    }

    throw new Error("Unsupported vote type")
  }, [chain, decodedCall, t])

  if (!chain?.nativeToken) return <SubSignBodyDefault />

  return (
    <SignContainer
      networkType="substrate"
      title={props.title}
      header={<SignViewIconHeader icon="vote" />}
    >
      <SignViewVotingVote tokenId={chain.nativeToken.id} {...props} />
    </SignContainer>
  )
}

const Delegate: DecodedCallComponent<PolkadotCalls["ConvictionVoting"]["delegate"]> = ({
  decodedCall: { args },
  payload,
}) => {
  const { t } = useTranslation("request")
  const chain = useChainByGenesisHash(payload.genesisHash)

  const props = useMemo(() => {
    return {
      trackId: args.class,
      representative: getAddressFromMultiAddress(args.to),
      conviction: getConviction(args.conviction),
      amount: args.balance,
    }
  }, [args])

  if (!chain?.nativeToken) return <SubSignBodyDefault />

  return (
    <SignContainer
      networkType="substrate"
      title={t("Delegate vote")}
      header={<SignViewIconHeader icon="vote" />}
    >
      <SignViewVotingDelegate
        tokenId={chain.nativeToken.id}
        explorerUrl={chain.subscanUrl}
        {...props}
      />
    </SignContainer>
  )
}

const Undelegate: DecodedCallComponent<PolkadotCalls["ConvictionVoting"]["undelegate"]> = ({
  decodedCall: { args },
  payload,
}) => {
  const { t } = useTranslation("request")
  const chain = useChainByGenesisHash(payload.genesisHash)

  const props = useMemo(() => {
    return {
      trackId: args.class,
    }
  }, [args.class])

  if (!chain?.nativeToken) return <SubSignBodyDefault />

  return (
    <SignContainer
      networkType="substrate"
      title={t("Undelegate vote")}
      header={<SignViewIconHeader icon="vote" />}
    >
      <SignViewVotingUndelegate {...props} />
    </SignContainer>
  )
}

export const getConviction = (conviction: VotingConviction) => {
  switch (conviction.type) {
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
      return 0
    default:
      throw new Error("Invalid conviction")
  }
}

export const CUSTOM_UI_CONVICTION_VOTING: DecodedCallComponentDefs = [
  ["ConvictionVoting", "vote", Vote],
  ["ConvictionVoting", "delegate", Delegate],
  ["ConvictionVoting", "undelegate", Undelegate],
]
