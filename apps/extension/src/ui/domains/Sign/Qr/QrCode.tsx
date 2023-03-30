import { Suspense, lazy } from "react"

import { FRAME_SIZE } from "./constants"
import { MultipartQrRenderer } from "./Renderers/MultipartQrRenderer"

const RaptorQrRenderer = lazy(() => import("./Renderers/RaptorQrRenderer"))

export const QrCode = ({ data }: { data?: Uint8Array }) => {
  if (!data) return null
  // TODO: Reuse renderer (img) and frame cycler, just swap out the encoder for these:
  if (data.length < FRAME_SIZE) return <MultipartQrRenderer data={data} />
  return (
    <Suspense fallback={null}>
      <RaptorQrRenderer data={data} />
    </Suspense>
  )
}
