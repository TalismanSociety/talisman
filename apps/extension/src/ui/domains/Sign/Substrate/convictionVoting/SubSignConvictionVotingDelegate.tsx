import { PolkadotCalls, VotingConviction } from "papi-descriptors"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignViewIconHeader } from "@ui/domains/Sign/Views/SignViewIconHeader"
import { useChainByGenesisHash } from "@ui/state"

import { SignContainer } from "../../SignContainer"
import { SignViewVotingDelegate } from "../../Views/convictionVoting/SignViewVotingDelegate"
import { SubSignBodyDefault } from "../SubSignBodyDefault"
import { SignCallDef, SignCustomUiComponent } from "../types"
import { getAddressFromMultiAddress } from "../util/getAddressFromMultiAddress"

type SupportedCall = {
  pallet: "ConvictionVoting"
  call: "delegate"
  args: PolkadotCalls["ConvictionVoting"]["delegate"]
}

export const SupportedCallsConvictionVotingDelegate: SignCallDef[] = [
  { pallet: "ConvictionVoting", call: "delegate" },
]

export const SubSignConvictionVotingDelegate: SignCustomUiComponent<SupportedCall["args"]> = ({
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
