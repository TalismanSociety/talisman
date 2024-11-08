import { PolkadotCalls } from "papi-descriptors"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignViewIconHeader } from "@ui/domains/Sign/Views/SignViewIconHeader"
import { useChainByGenesisHash } from "@ui/state"

import { SignContainer } from "../../SignContainer"
import { SignViewVotingUndelegate } from "../../Views/convictionVoting/SignViewVotingUndelegate"
import { SubSignBodyDefault } from "../SubSignBodyDefault"
import { SignCallDef, SignCustomUiComponent } from "../types"

type SupportedCall = {
  pallet: "ConvictionVoting"
  call: "undelegate"
  args: PolkadotCalls["ConvictionVoting"]["undelegate"]
}

export const SupportedCallsConvictionVotingUndelegate: SignCallDef[] = [
  { pallet: "ConvictionVoting", call: "undelegate" },
]

export const SubSignConvictionVotingUndelegate: SignCustomUiComponent<SupportedCall["args"]> = ({
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
