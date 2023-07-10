import { decodeString } from "@polkadot/react-qr/util"
import QrCodeStyling from "@solana/qr-code-styling"
import { useEffect, useReducer, useRef, useState } from "react"
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
export const QrCode = ({ data, image, imageOptions }: Props) => {
  const { t } = useTranslation("request")
  const qrCodeFrames = useRef<Array<string | null> | null>(null)

  const [animGeneration, resetQrAnimation] = useReducer((x) => (x + 1) % Number.MAX_SAFE_INTEGER, 0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    if (data.length > Math.pow(2, 31))
      return setError(t("Payload is too large to be encoded in a QR code"))
    else setError(null)

    let cancelled = false
    ;(async () => {
      const { default: encode } = await (data.length < FRAME_SIZE
        ? import("./Encoders/MultipartQrEncoder")
        : import("./Encoders/RaptorQrEncoder"))

      const dataFrames = await encode(data)

      qrCodeFrames.current = new Array(dataFrames.length).fill(null)
      resetQrAnimation()
      for (const [index, dataFrame] of dataFrames.entries()) {
        // stop computing for nothing, happens especially in dev because of strict mode double mount
        if (cancelled) return

        const blob = await new QrCodeStyling({
          type: "svg",
          data: decodeString(dataFrame),
          margin: 0,
          qrOptions: { mode: "Byte", errorCorrectionLevel: "L" },
          dotsOptions: { type: "dots" },
          cornersSquareOptions: { type: "extra-rounded" },
          cornersDotOptions: { type: "dot" },
          image: image ?? talismanRedHandSvg,
          imageOptions: {
            hideBackgroundDots: true,
            imageSize: 0.7,
            margin: 5,
            ...(imageOptions ?? {}),
          },
        }).getRawData("svg")
        if (blob) qrCodeFrames.current[index] = URL.createObjectURL(blob)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [data, image, imageOptions, t])

  const [qrCode, setQrCode] = useState<string | null>(null)
  useEffect(() => {
    if (qrCodeFrames.current === null) return setQrCode(null)
    if (qrCodeFrames.current.length < 1) return setQrCode(null)
    if (qrCodeFrames.current.length === 1) setQrCode(qrCodeFrames.current[0])

    setQrCode(qrCodeFrames.current[0])

    let active = true
    const interval = 125 // 1000ms/125ms = 8 frames per second
    const start = Date.now()
    const animate = () => {
      if (!active) return

      const time = Date.now()
      const index = Math.floor((time - start) / interval) % (qrCodeFrames.current?.length ?? 0)

      setQrCode(qrCodeFrames.current?.[index] ?? null)
      requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)

    return () => {
      active = false
    }
  }, [animGeneration])

  if (error)
    return (
      <div className="text-alert-error relative h-full w-full whitespace-pre-wrap bg-white">
        {error}
      </div>
    )
  if (!qrCode) return null

  return <img className="relative h-full w-full" src={qrCode} alt="" />
}
