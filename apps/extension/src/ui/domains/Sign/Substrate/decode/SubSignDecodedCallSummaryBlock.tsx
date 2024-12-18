import { FallbackErrorBoundary } from "@talisman/components/FallbackErrorBoundary"

import { SUMMARY_COMPONENTS } from "../summary/calls"
import { DecodedCallComponent } from "../types"
import { useDecodedCallComponent } from "../util/useDecodedCallComponent"

export const SubSignDecodedCallSummaryBlock: DecodedCallComponent<unknown> = (props) => {
  const Component = useDecodedCallComponent(props.decodedCall, SUMMARY_COMPONENTS)

  if (!Component) return null

  return (
    <FallbackErrorBoundary fallback={null}>
      <Component {...props} mode="block" />
    </FallbackErrorBoundary>
  )
}
