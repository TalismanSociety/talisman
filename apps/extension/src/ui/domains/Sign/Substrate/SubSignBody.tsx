import { log } from "@core/log"
import { GenericExtrinsic } from "@polkadot/types"
import { ErrorBoundary, FallbackRender } from "@sentry/react"
import { SignViewBodyShimmer } from "@ui/domains/Sign/Views/SignViewBodyShimmer"
import { useExtrinsic } from "@ui/hooks/useExtrinsic"
import { FC } from "react"

import { usePolkadotSigningRequest } from "../SignRequestContext"
import { SubSignConvictionVotingDelegate } from "./convictionVoting/SubSignConvictionVotingDelegate"
import { SubSignConvictionVotingUndelegate } from "./convictionVoting/SubSignConvictionVotingUndelegate"
import { SubSignConvictionVotingVote } from "./convictionVoting/SubSignConvictionVotingVote"
import { SubSignBodyDefault } from "./SubSignBodyDefault"
import { SubSignXcmTransferAssets } from "./xcm/SubSignXcmTransferAssets"
import { SubSignXTokensTransfer } from "./xTokens/SubSignXTokensTransfer"

const getComponentFromTxDetails = (extrinsic: GenericExtrinsic | null | undefined) => {
  if (!extrinsic) return null

  const method = `${extrinsic.method.section}.${extrinsic.method.method}`

  switch (method) {
    case "x-tokens.transfer":
      return SubSignXTokensTransfer
    case "convictionVoting.delegate":
      return SubSignConvictionVotingDelegate
    case "convictionVoting.undelegate":
      return SubSignConvictionVotingUndelegate
    case "convictionVoting.vote":
      return SubSignConvictionVotingVote
    case "xcmPallet.limitedReserveTransferAssets":
    case "polkadotXcm.limitedReserveTransferAssets":
      return SubSignXcmTransferAssets
    case "xTokens.transfer":
      return SubSignXTokensTransfer
    default:
      log.debug("Unknown signing request type", { method })
      return null
  }
}

const Fallback: FallbackRender = () => <SubSignBodyDefault />

export const SubSignBody: FC = () => {
  const { payload } = usePolkadotSigningRequest()
  const { isLoading, data: extrinsic } = useExtrinsic(payload)

  if (isLoading) return <SignViewBodyShimmer />

  const Component = getComponentFromTxDetails(extrinsic)

  if (Component)
    return (
      <ErrorBoundary fallback={Fallback}>
        <Component />
      </ErrorBoundary>
    )

  return <SubSignBodyDefault />
}
