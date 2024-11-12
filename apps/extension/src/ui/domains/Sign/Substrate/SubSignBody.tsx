import { ErrorBoundary, FallbackRender } from "@sentry/react"
import { isJsonPayload } from "extension-core"
import { FC, useMemo } from "react"

import { usePolkadotSigningRequest } from "../SignRequestContext"
import { CUSTOM_UI_CONVICTION_VOTING } from "./customUis/CustomUisConvictionVoting"
import { CUSTOM_UI_NOMINATION_POOLS } from "./customUis/CustomUisNominationPools"
import { CUSTOM_UI_UTILITY } from "./customUis/CustomUisUtility"
import { CUSTOM_UI_XCM } from "./customUis/CustomUisXcm"
import { CUSTOM_UIX_TOKENS } from "./customUis/CustomUisXTokens"
import { SubSignBodyDefault } from "./SubSignBodyDefault"
import { DecodedCallComponentDefs } from "./types"

const CUSTOM_UI_COMPONENTS: DecodedCallComponentDefs = [
  ...CUSTOM_UI_UTILITY, // batch
  ...CUSTOM_UI_CONVICTION_VOTING,
  ...CUSTOM_UI_NOMINATION_POOLS,
  ...CUSTOM_UIX_TOKENS,
  ...CUSTOM_UI_XCM,
]

export const SubSignBody: FC = () => {
  const { payload, sapi, decodedCall } = usePolkadotSigningRequest()

  const Component = useMemo(() => {
    if (!decodedCall) return null
    return (
      CUSTOM_UI_COMPONENTS.find(
        ([pallet, call]) => pallet === decodedCall.pallet && call === decodedCall.call,
      )?.[2] ?? null
    )
  }, [decodedCall])

  if (decodedCall && sapi && Component && isJsonPayload(payload))
    return (
      <ErrorBoundary fallback={Fallback}>
        <Component payload={payload} decodedCall={decodedCall} sapi={sapi} />
      </ErrorBoundary>
    )

  return <SubSignBodyDefault />
}

const Fallback: FallbackRender = () => <SubSignBodyDefault />
