import { ErrorBoundary } from "@sentry/react"

import { SUMMARY_COMPONENTS } from "../summary/calls"
import { DecodedCallComponent } from "../types"
import { useDecodedCallComponent } from "../util/useDecodedCallComponent"

export const SubSignDecodedCallSummaryBlock: DecodedCallComponent<unknown> = (props) => {
  const Component = useDecodedCallComponent(props.decodedCall, SUMMARY_COMPONENTS)

  if (!Component) return null

  return (
    <ErrorBoundary>
      <Component {...props} mode="block" />
    </ErrorBoundary>
  )
}
