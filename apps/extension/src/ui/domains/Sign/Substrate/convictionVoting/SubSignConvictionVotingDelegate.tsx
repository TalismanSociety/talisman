import { isJsonPayload } from "extension-core"
import { log } from "extension-shared"
import { PolkadotCalls, VotingConviction } from "papi-descriptors"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignViewIconHeader } from "@ui/domains/Sign/Views/SignViewIconHeader"

import { SignContainer } from "../../SignContainer"
import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { SignViewVotingDelegate } from "../../Views/convictionVoting/SignViewVotingDelegate"
import { SignViewBodyShimmer } from "../../Views/SignViewBodyShimmer"
import { getAddressFromMultiAddress } from "../util/getAddressFromMultiAddress"

type SupportedCall = {
  pallet: "ConvictionVoting"
  call: "delegate"
  args: PolkadotCalls["ConvictionVoting"]["delegate"]
}

export const SubSignConvictionVotingDelegate = () => {
  const { t } = useTranslation("request")
  const { chain, payload, sapi } = usePolkadotSigningRequest()

  const props = useMemo(() => {
    if (!sapi) throw new Error("missing sapi")
    if (!isJsonPayload(payload)) throw new Error("missing payload")
    if (!chain?.nativeToken) throw new Error("missing chain or native token")

    const { pallet, call, args } = sapi.getDecodedCallFromPayload<SupportedCall>(payload)
    log.debug("Decoded call", { pallet, call, args })

    return {
      trackId: args.class,
      representative: getAddressFromMultiAddress(args.to),
      conviction: getConviction(args.conviction),
      amount: args.balance,
    }
  }, [chain, payload, sapi])

  if (!props || !chain?.nativeToken) return <SignViewBodyShimmer />

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
