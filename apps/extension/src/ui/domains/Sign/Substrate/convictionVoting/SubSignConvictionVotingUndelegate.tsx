import { isJsonPayload } from "extension-core"
import { log } from "extension-shared"
import { PolkadotCalls } from "papi-descriptors"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignViewIconHeader } from "@ui/domains/Sign/Views/SignViewIconHeader"

import { SignContainer } from "../../SignContainer"
import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { SignViewVotingUndelegate } from "../../Views/convictionVoting/SignViewVotingUndelegate"
import { SignViewBodyShimmer } from "../../Views/SignViewBodyShimmer"

type SupportedCall = {
  pallet: "ConvictionVoting"
  call: "undelegate"
  args: PolkadotCalls["ConvictionVoting"]["undelegate"]
}

export const SubSignConvictionVotingUndelegate = () => {
  const { t } = useTranslation("request")
  const { chain, payload, sapi } = usePolkadotSigningRequest()

  const props = useMemo(() => {
    if (!sapi) throw new Error("missing sapi")
    if (!isJsonPayload(payload)) throw new Error("missing payload")

    const { pallet, call, args } = sapi.getDecodedCallFromPayload<SupportedCall>(payload)
    log.debug("Decoded call", { pallet, call, args })

    return {
      trackId: args.class,
    }
  }, [payload, sapi])

  if (!props || !chain?.nativeToken) return <SignViewBodyShimmer />

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
