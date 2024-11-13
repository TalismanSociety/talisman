import { ErrorBoundary, FallbackRender } from "@sentry/react"
import { isJsonPayload } from "extension-core"
import { FC } from "react"

import { usePolkadotSigningRequest } from "../SignRequestContext"
import { CUSTOM_UI_COMPONENTS } from "./customUis"
import { SubSignBodyDefault } from "./SubSignBodyDefault"
import { useDecodedCallComponent } from "./util/useDecodedCallComponent"

export const SubSignBody: FC = () => {
  const { payload, sapi, decodedCall } = usePolkadotSigningRequest()

  const Component = useDecodedCallComponent(decodedCall, CUSTOM_UI_COMPONENTS)

  if (decodedCall && sapi && Component && isJsonPayload(payload))
    return (
      <ErrorBoundary fallback={Fallback}>
        <Component payload={payload} decodedCall={decodedCall} sapi={sapi} />
      </ErrorBoundary>
    )

  return <SubSignBodyDefault />
}

const Fallback: FallbackRender = () => <SubSignBodyDefault />
