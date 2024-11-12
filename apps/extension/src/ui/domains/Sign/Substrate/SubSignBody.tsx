import { ErrorBoundary, FallbackRender } from "@sentry/react"
import { isJsonPayload, SignerPayloadJSON } from "extension-core"
import { FC, useMemo } from "react"

import { log } from "@extension/shared"
import { DecodedCall } from "@ui/util/scaleApi"

import { usePolkadotSigningRequest } from "../SignRequestContext"
import { SubSignBatch, SupportedCallsBatch } from "./batch/SubSignBatch"
import {
  SubSignConvictionVotingDelegate,
  SupportedCallsConvictionVotingDelegate,
} from "./convictionVoting/SubSignConvictionVotingDelegate"
import {
  SubSignConvictionVotingUndelegate,
  SupportedCallsConvictionVotingUndelegate,
} from "./convictionVoting/SubSignConvictionVotingUndelegate"
import {
  SubSignConvictionVotingVote,
  SupportedCallsConvictionVotingVote,
} from "./convictionVoting/SubSignConvictionVotingVote"
import {
  SubSignStakingWithdraw,
  SupportedCallsStakingWithdraw,
} from "./staking/SubSignStakingWithdraw"
import { SubSignBodyDefault } from "./SubSignBodyDefault"
import { SubSignXcmTransfer, SupportedCallsXcmTransfer } from "./xcm/SubSignXcmTransfer"
import {
  SubSignXTokensTransfer,
  SupportedCallsXTokensTransfer,
} from "./xTokens/SubSignXTokensTransfer"

type CallDef = { pallet: string; call: string }

type CustomUiComponent = FC<{
  decodedCall: DecodedCall
  payload: SignerPayloadJSON
}>

const CUSTOM_UIS: [CallDef[], CustomUiComponent][] = [
  [SupportedCallsConvictionVotingVote, SubSignConvictionVotingVote],
  [SupportedCallsConvictionVotingDelegate, SubSignConvictionVotingDelegate],
  [SupportedCallsConvictionVotingUndelegate, SubSignConvictionVotingUndelegate],
  [SupportedCallsXcmTransfer, SubSignXcmTransfer],
  [SupportedCallsXTokensTransfer, SubSignXTokensTransfer],
  [SupportedCallsStakingWithdraw, SubSignStakingWithdraw],
  [SupportedCallsBatch, SubSignBatch],
]

export const SubSignBody: FC = () => {
  const { payload, sapi, decodedCall } = usePolkadotSigningRequest()

  const [call, Component, jsonPayload] = useMemo<
    [DecodedCall | null, CustomUiComponent | null, SignerPayloadJSON | null]
  >(() => {
    if (!decodedCall || !sapi || !isJsonPayload(payload)) return [null, null, null]

    try {
      return [decodedCall, getComponentFromCall(decodedCall), payload]
    } catch (err) {
      log.error("Error decoding call from payload", { err, sapi, payload })
    }

    return [null, null, null]
  }, [payload, sapi, decodedCall])

  if (call && Component && jsonPayload)
    return (
      <ErrorBoundary fallback={Fallback}>
        <Component payload={jsonPayload} decodedCall={call} />
      </ErrorBoundary>
    )

  return <SubSignBodyDefault />
}

const Fallback: FallbackRender = () => <SubSignBodyDefault />

const isSupportedCall = (call: DecodedCall, supportedCallDef: CallDef) =>
  call.pallet === supportedCallDef.pallet && call.call === supportedCallDef.call

const isComponentMatch = (call: DecodedCall, supportedCalls: CallDef[]) =>
  supportedCalls.some((cd) => isSupportedCall(call, cd))

const getComponentFromCall = (call: DecodedCall) => {
  if (!call) return null

  for (const [supportedCalls, component] of CUSTOM_UIS)
    if (isComponentMatch(call, supportedCalls)) return component

  return null
}
