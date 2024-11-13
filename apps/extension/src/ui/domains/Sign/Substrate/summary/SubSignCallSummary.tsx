import { ErrorBoundary } from "@sentry/react"

import { DecodedCallComponent } from "../types"
import { useDecodedCallComponent } from "../util/useDecodedCallComponent"
import { SUMMARY_COMPONENTS } from "./calls"

export const SubSignCallSummary: DecodedCallComponent<unknown> = ({
  decodedCall,
  sapi,
  payload,
}) => {
  const Component = useDecodedCallComponent(decodedCall, SUMMARY_COMPONENTS)

  if (!Component || !decodedCall) return null

  return (
    <ErrorBoundary>
      <Component decodedCall={decodedCall} sapi={sapi} payload={payload} />
    </ErrorBoundary>
  )
}
