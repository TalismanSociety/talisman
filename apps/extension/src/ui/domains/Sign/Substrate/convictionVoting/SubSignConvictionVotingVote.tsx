import { PolkadotCalls } from "papi-descriptors"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignViewVotingVote } from "@ui/domains/Sign/Views/convictionVoting/SignViewVotingVote"
import { SignViewIconHeader } from "@ui/domains/Sign/Views/SignViewIconHeader"
import { useChainByGenesisHash } from "@ui/state"

import { SignContainer } from "../../SignContainer"
import { SubSignBodyDefault } from "../SubSignBodyDefault"
import { SignCallDef, SignCustomUiComponent } from "../types"

type SupportedCall = {
  pallet: "ConvictionVoting"
  call: "vote"
  args: PolkadotCalls["ConvictionVoting"]["vote"]
}

export const SupportedCallsConvictionVotingVote: SignCallDef[] = [
  { pallet: "ConvictionVoting", call: "vote" },
]

export const SubSignConvictionVotingVote: SignCustomUiComponent<SupportedCall["args"]> = ({
  decodedCall: { args },
  payload,
}) => {
  const { t } = useTranslation("request")
  const chain = useChainByGenesisHash(payload.genesisHash)

  const props = useMemo(() => {
    if (!chain) throw new Error("chain not found")

    if (args.vote.type === "Standard") {
      const { isAye, conviction } = decodeStandardVote(args.vote.value.vote)

      return {
        title: isAye ? t("Vote Yes") : t("Vote No"),
        pollIndex: args.poll_index,
        conviction,
        voteAmount: args.vote.value.balance,
      }
    }

    throw new Error("Unsupported vote type")
  }, [chain, args, t])

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

const AYE_BITS = 0b10000000
const CON_MASK = 0b01111111

const decodeStandardVote = (
  vote: number,
): {
  isAye: boolean
  conviction: number
} => ({
  isAye: (vote & AYE_BITS) === AYE_BITS,
  conviction: vote & CON_MASK,
})
