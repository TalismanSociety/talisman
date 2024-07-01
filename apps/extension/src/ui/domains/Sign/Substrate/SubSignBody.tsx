import { log } from "@extension/shared"
import { GenericExtrinsic } from "@polkadot/types"
import { ErrorBoundary, FallbackRender } from "@sentry/react"
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
    case "xcmPallet.reserveTransferAssets":
    case "xcmPallet.limitedReserveTransferAssets":
    case "xcmPallet.limitedTeleportAssets":
    case "polkadotXcm.reserveTransferAssets":
    case "polkadotXcm.limitedReserveTransferAssets":
    case "polkadotXcm.limitedTeleportAssets":
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
  const { extrinsic } = usePolkadotSigningRequest()

  const Component = getComponentFromTxDetails(extrinsic)

  if (Component)
    return (
      <ErrorBoundary fallback={Fallback}>
        <Component />
      </ErrorBoundary>
    )

  return <SubSignBodyDefault />
}
