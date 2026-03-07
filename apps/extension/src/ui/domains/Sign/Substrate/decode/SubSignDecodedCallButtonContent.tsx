import type { DecodedCall } from "@talismn/sapi"
import { FallbackErrorBoundary } from "@ui/components/FallbackErrorBoundary"
import type { FC } from "react"

import { SUMMARY_COMPONENTS } from "../summary/calls"
import type { DecodedCallComponent, SummaryButtonDisplayMode } from "../types"
import { useDecodedCallComponent } from "../util/useDecodedCallComponent"

const ContentFallback: FC<{ decodedCall: DecodedCall }> = ({ decodedCall }) => (
  <>
    {decodedCall.pallet}: <span className="text-body">{decodedCall.method}</span>
  </>
)

export const SubSignDecodedCallButtonContent: DecodedCallComponent<
  unknown,
  { mode: SummaryButtonDisplayMode }
> = (props) => {
  const Component = useDecodedCallComponent(props.decodedCall, SUMMARY_COMPONENTS)

  if (!Component) return <ContentFallback decodedCall={props.decodedCall} />

  return (
    <FallbackErrorBoundary fallback={<ContentFallback decodedCall={props.decodedCall} />}>
      <Component {...props} mode={props.mode} />
    </FallbackErrorBoundary>
  )
}
