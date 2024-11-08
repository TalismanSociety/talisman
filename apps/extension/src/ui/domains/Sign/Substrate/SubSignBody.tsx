import { ErrorBoundary, FallbackRender } from "@sentry/react"
import { isJsonPayload, SignerPayloadJSON } from "extension-core"
import { FC, useMemo } from "react"

import { log } from "@extension/shared"
import { DecodedCall } from "@ui/util/scaleApi"

import { usePolkadotSigningRequest } from "../SignRequestContext"
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
]

const Fallback: FallbackRender = () => <SubSignBodyDefault />

export const SubSignBody: FC = () => {
  const { payload, sapi } = usePolkadotSigningRequest()

  const [call, Component, json] = useMemo<
    [DecodedCall | null, CustomUiComponent | null, SignerPayloadJSON | null]
  >(() => {
    if (!sapi || !isJsonPayload(payload)) return [null, null, null]

    try {
      const call = sapi.getDecodedCallFromPayload(payload)
      if (call) return [call, getComponentFromCall(call), payload]
    } catch (err) {
      log.error("Error decoding call from payload", { err, sapi, payload })
    }

    return [null, null, null]
  }, [payload, sapi])

  if (call && Component && json)
    return (
      <ErrorBoundary fallback={Fallback}>
        <Component payload={json} decodedCall={call} />
      </ErrorBoundary>
    )

  return <SubSignBodyDefault />
}

const isSupportedCall = (call: DecodedCall, supportedCallDef: CallDef) =>
  call.pallet === supportedCallDef.pallet && call.call === supportedCallDef.call

const isComponentMatch = (call: DecodedCall, supportedCalls: CallDef[]) =>
  supportedCalls.some((cd) => isSupportedCall(call, cd))

const getComponentFromCall = (call: DecodedCall | null) => {
  if (!call) return null

  for (const [supportedCalls, component] of CUSTOM_UIS)
    if (isComponentMatch(call, supportedCalls)) return component

  return null
}
