import { log } from "@extension/shared"
import { decodeString } from "@polkadot/react-qr/util"
import QrCodeStyling from "@solana/qr-code-styling"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { FC, Suspense, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { FRAME_SIZE, talismanRedHandSvg } from "./constants"

type Props = {
  data?: Uint8Array
  image?: string
  imageOptions?: {
    hideBackgroundDots?: boolean
    imageSize?: number
    crossOrigin?: string
    margin?: number
  }
}

// will suspense when importing encoder
export const QrCode: FC<Props> = (props) => (
  <Suspense fallback={<SuspenseTracker name="QrCode" />}>
    <QrCodeInner {...props} />
  </Suspense>
)

const QrCodeInner = ({ data, image, imageOptions }: Props) => {
  const { t } = useTranslation("request")
  const qrCodeFrames = useRef<Array<string | null> | null>(null)
  const qrCodeFramesReady = useRef(0)
  const [generation, setGeneration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    if (data.length > Math.pow(2, 31))
      return setError(t("Payload is too large to be encoded in a QR code"))
    else setError(null)

    // reset
    qrCodeFrames.current = null
    qrCodeFramesReady.current = 0
    setGeneration((g) => g + 1)

    let cancelled = false
    ;(async () => {
      const { default: encode } = await (data.length < FRAME_SIZE
        ? import("./Encoders/MultipartQrEncoder")
        : import("./Encoders/RaptorQrEncoder"))

      if (cancelled) return
      const stop1 = log.timer("encoding payload")
      const dataFrames = await encode(data)
      stop1()

      if (!qrCodeFrames.current) qrCodeFrames.current = new Array(dataFrames.length).fill(null)

      for (const [index, dataFrame] of dataFrames.entries()) {
        // stop computing for nothing, happens especially in dev because of strict mode double mount
        if (cancelled) return

        const blob = await new QrCodeStyling({
          type: "svg",
          data: decodeString(dataFrame),
          margin: 0,
          qrOptions: { mode: "Byte", errorCorrectionLevel: "L" },
          dotsOptions: { type: "square" },
          cornersSquareOptions: { type: "square" },
          cornersDotOptions: { type: "square" },
          image: image ?? talismanRedHandSvg,
          imageOptions: {
            hideBackgroundDots: true,
            imageSize: 0.7,
            margin: 5,
            ...(imageOptions ?? {}),
          },
        }).getRawData("svg")

        if (blob) {
          qrCodeFrames.current[index] = URL.createObjectURL(blob)
          qrCodeFramesReady.current = index
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [data, image, imageOptions, t])

  const [qrCode, setQrCode] = useState<string | null>(null)
  useEffect(() => {
    const interval = 125 // 1000ms/125ms = 8 frames per second
    let index = 0

    const renderInterval = setInterval(() => {
      if (!qrCodeFrames.current?.length) return

      if (qrCodeFrames.current.length === 1 && qrCodeFrames.current[0] !== null) {
        // single frame, display it and stop animating
        clearInterval(renderInterval)
        setQrCode(qrCodeFrames.current[0])
        return
      }

      // display next frame
      setQrCode(qrCodeFrames.current?.[index % qrCodeFramesReady.current] ?? null)
      index++
    }, interval)

    return () => {
      clearInterval(renderInterval)
    }
  }, [generation])

  if (error) return <QrCodeError error={error} />
  if (!qrCode) return null

  return <img className="relative h-full w-full" src={qrCode} alt="" />
}

export const QrCodeError = ({ error }: { error?: string | null }) => (
  <div className="text-alert-error relative flex h-full w-full items-center justify-center whitespace-pre-wrap bg-white text-center text-xs">
    {error}
  </div>
)
