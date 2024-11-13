import { ErrorBoundary } from "@sentry/react"
import { FC } from "react"

import { DecodedCall } from "@ui/util/scaleApi"

import { SUMMARY_COMPONENTS } from "../summary/calls"
import { DecodedCallComponent } from "../types"
import { useDecodedCallComponent } from "../util/useDecodedCallComponent"

const ContentFallback: FC<{ decodedCall: DecodedCall }> = ({ decodedCall }) => (
  <>
    {decodedCall.pallet} : {decodedCall.method}
  </>
)

export const SubSignDecodeButtonContent: DecodedCallComponent<unknown> = ({
  sapi,
  decodedCall,
  payload,
}) => {
  const Component = useDecodedCallComponent(decodedCall, SUMMARY_COMPONENTS)

  if (!Component) return <ContentFallback decodedCall={decodedCall} />

  return (
    <ErrorBoundary fallback={<ContentFallback decodedCall={decodedCall} />}>
      <Component decodedCall={decodedCall} sapi={sapi} payload={payload} inline />
    </ErrorBoundary>
  )
}
