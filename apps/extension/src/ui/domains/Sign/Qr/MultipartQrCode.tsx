import { decodeString } from "@polkadot/react-qr/util"
import { u8aConcat } from "@polkadot/util"
import QrCodeStyling from "@solana/qr-code-styling"
import { useEffect, useState } from "react"

import { talismanRedHandSvg } from "./constants"

export const MultipartQrCode = ({ data }: { data?: Uint8Array }) => {
  const [qrCodeFrames, setQrCodeFrames] = useState<Array<string | null> | null>(null)

  useEffect(() => {
    if (!data) return

    const MULTIPART = new Uint8Array([0])
    const encodeNumber = (value: number) => new Uint8Array([value >> 8, value & 0xff])
    const FRAME_SIZE = 1024
    const numberOfFrames = Math.ceil(data.length / FRAME_SIZE)
    const dataFrames = Array.from({ length: numberOfFrames })
      .map((_, index) => data.subarray(index * FRAME_SIZE, (index + 1) * FRAME_SIZE))
      .map((dataFrame, index) =>
        u8aConcat(MULTIPART, encodeNumber(numberOfFrames), encodeNumber(index), dataFrame)
      )

    let cancelled = false
    ;(async () => {
      const qrCodeFrames = []
      for (const dataFrame of dataFrames) {
        const blob = await new QrCodeStyling({
          type: "svg",
          data: decodeString(dataFrame),
          margin: 0,
          qrOptions: { mode: "Byte", errorCorrectionLevel: "L" },
          dotsOptions: { type: "dots" },
          cornersSquareOptions: { type: "extra-rounded" },
          cornersDotOptions: { type: "dot" },
          image: talismanRedHandSvg,
          imageOptions: { hideBackgroundDots: true, imageSize: 0.7 },
        }).getRawData("svg")
        qrCodeFrames.push(blob ? URL.createObjectURL(blob) : blob)
      }

      if (cancelled) return
      setQrCodeFrames(qrCodeFrames)
    })()

    return () => {
      cancelled = true
    }
  }, [data])

  const [qrCode, setQrCode] = useState<string | null>(null)
  useEffect(() => {
    if (qrCodeFrames === null) return setQrCode(null)
    if (qrCodeFrames.length < 1) return setQrCode(null)
    if (qrCodeFrames.length === 1) setQrCode(qrCodeFrames[0])

    let index = 0
    setQrCode(qrCodeFrames[index])
    const interval = setInterval(() => {
      index = (index + 1) % qrCodeFrames.length
      setQrCode(qrCodeFrames[index])
    }, 100)

    return () => clearInterval(interval)
  }, [qrCodeFrames])

  if (!qrCode) return null

  return <img className="relative h-full w-full" src={qrCode} />
}
