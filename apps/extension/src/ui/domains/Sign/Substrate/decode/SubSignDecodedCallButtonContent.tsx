import { ErrorBoundary } from "@sentry/react"
import { FC } from "react"

import { DecodedCall } from "@ui/util/scaleApi"

import { SUMMARY_COMPONENTS } from "../summary/calls"
import { DecodedCallComponent, SummaryButtonDisplayMode } from "../types"
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
    <ErrorBoundary fallback={<ContentFallback decodedCall={props.decodedCall} />}>
      <Component {...props} mode={props.mode} />
    </ErrorBoundary>
  )
}
