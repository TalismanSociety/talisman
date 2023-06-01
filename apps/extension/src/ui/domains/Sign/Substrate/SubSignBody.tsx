import { log } from "@core/log"
import { GenericExtrinsic } from "@polkadot/types"
import { ErrorBoundary, FallbackRender } from "@sentry/react"
import * as Sentry from "@sentry/react"
import { SignViewBodyShimmer } from "@ui/domains/Ethereum/Sign/views/SignViewBodyShimmer"
import { useExtrinsic } from "@ui/hooks/useExtrinsic"
import { FC } from "react"

import { usePolkadotSigningRequest } from "../SignRequestContext"
import { SubSignConvictionVotingVote } from "./convictionVoting/SubSignConvictionVotingVote"
import { SubSignBodyDefault } from "./SubSignBodyDefault"
import { SubSignXTokensTransfer } from "./SubSignXTokensTransfer"

const getComponentFromTxDetails = (extrinsic: GenericExtrinsic | null | undefined) => {
  if (!extrinsic) return null

  const method = `${extrinsic.method.section}.${extrinsic.method.method}`

  switch (method) {
    case "x-tokens.transfer":
      return SubSignXTokensTransfer
    case "convictionVoting.vote":
      return SubSignConvictionVotingVote
    default:
      log.debug("Unknown signing request type", { method })
      Sentry.captureMessage("Unknown signing request type", { extra: { method } })
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
