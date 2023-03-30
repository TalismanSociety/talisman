import { decodeString } from "@polkadot/react-qr/util"
import { u8aConcat } from "@polkadot/util"
import QrCodeStyling from "@solana/qr-code-styling"
import { useEffect, useReducer, useRef, useState } from "react"

import { FRAME_SIZE, talismanRedHandSvg } from "../constants"

export const MultipartQrRenderer = ({ data }: { data?: Uint8Array }) => {
  const qrCodeFrames = useRef<Array<string | null> | null>(null)

  const [animGeneration, resetQrAnimation] = useReducer((x) => (x + 1) % Number.MAX_SAFE_INTEGER, 0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    if (data.length > Math.pow(2, 31))
      return setError("Payload is too large to be encoded in a QR code")
    else setError(null)

    let cancelled = false
    ;(async () => {
      const MULTIPART = new Uint8Array([0])
      const encodeNumber = (value: number) => new Uint8Array([value >> 8, value & 0xff])
      const numberOfFrames = Math.ceil(data.length / FRAME_SIZE)

      const dataFrames = Array.from({ length: numberOfFrames })
        .map((_, index) => data.subarray(index * FRAME_SIZE, (index + 1) * FRAME_SIZE))
        .map((dataFrame, index) =>
          u8aConcat(MULTIPART, encodeNumber(numberOfFrames), encodeNumber(index), dataFrame)
        )

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
          image: talismanRedHandSvg,
          imageOptions: { hideBackgroundDots: true, imageSize: 0.7, margin: 5 },
        }).getRawData("svg")
        if (blob) qrCodeFrames.current[index] = URL.createObjectURL(blob)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [data])

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

  return <img className="relative h-full w-full" src={qrCode} />
}
