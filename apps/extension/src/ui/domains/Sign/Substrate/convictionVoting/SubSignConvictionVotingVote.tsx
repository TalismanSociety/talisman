import { isJsonPayload } from "extension-core"
import { log } from "extension-shared"
import { PolkadotCalls } from "papi-descriptors"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignViewVotingVote } from "@ui/domains/Sign/Views/convictionVoting/SignViewVotingVote"
import { SignViewIconHeader } from "@ui/domains/Sign/Views/SignViewIconHeader"

import { SignContainer } from "../../SignContainer"
import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { SignViewBodyShimmer } from "../../Views/SignViewBodyShimmer"

type SupportedCall = {
  pallet: "ConvictionVoting"
  call: "vote"
  args: PolkadotCalls["ConvictionVoting"]["vote"]
}

export const SubSignConvictionVotingVote = () => {
  const { t } = useTranslation("request")
  const { chain, payload, sapi } = usePolkadotSigningRequest()

  const props = useMemo(() => {
    if (!sapi) throw new Error("missing sapi")
    if (!isJsonPayload(payload)) throw new Error("missing payload")
    if (!chain?.nativeToken) throw new Error("missing chain or native token")

    const { pallet, call, args } = sapi.getDecodedCallFromPayload<SupportedCall>(payload)
    log.debug("Decoded call", { pallet, call, args })

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
  }, [chain, payload, sapi, t])

  if (!props || !chain?.nativeToken) return <SignViewBodyShimmer />

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
