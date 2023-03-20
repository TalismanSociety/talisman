import { lazy } from "react"

import { FRAME_SIZE } from "./constants"
import { MultipartQrCode } from "./MultipartQrCode"

const RaptorQrCode = lazy(() => import("./RaptorQrCode"))

export const QrCode = ({ data }: { data?: Uint8Array }) => {
  if (!data) return null
  if (data.length < FRAME_SIZE) return <MultipartQrCode data={data} />
  return <RaptorQrCode data={data} />
}
