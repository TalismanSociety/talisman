import { decodeString } from "@polkadot/react-qr/util"
import { hexToNumber, numberToU8a, u8aConcat, u8aToU8a } from "@polkadot/util"
import QRCodeStyling from "@solana/qr-code-styling"
import { classNames } from "@talismn/util"
import init, { Encoder } from "raptorq"
import { FC, useEffect, useRef, useState } from "react"

import { FRAME_SIZE, talismanRedHandSvg } from "./constants"

// This component uses raptorq wasm library (250ko) to generate the QR code, import only if necessary
// spec here : https://github.com/varovainen/parity-signer/blob/2022-05-25-uos/docs/src/development/UOS.md
const RaptorQrCode: FC<{ data?: Uint8Array }> = ({ data }) => {
  const [totalFramesCount, setTotalFramesCount] = useState<number>()

  // storing in a ref so we can start iterating on frames before they are all ready
  // they will appear as they are generated
  const refQrCodes = useRef<string[]>()
  const refImg = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!data) return
    let cancelled = false

    init().then(() => {
      if (data.length > Math.pow(2, 31)) {
        // eslint-disable-next-line no-console
        console.error("Data is too large to be encoded in a QR code")
        return
      }

      const framesCount = Math.ceil(data.length / FRAME_SIZE)
      const repairPackets = data.length <= FRAME_SIZE ? 0 : framesCount
      const framePrefix = numberToU8a(hexToNumber("0x80000000") + data.length)

      const encoder = Encoder.with_defaults(data, FRAME_SIZE)
      const frames = encoder
        .encode(repairPackets)
        .map((frame) => u8aToU8a(u8aConcat(framePrefix, u8aToU8a(frame))))

      ;(async () => {
        const qrCodeFrames: string[] = [] // work with a local var to prevent rerenders to mix they qrcodes (dev mode)
        refQrCodes.current = qrCodeFrames
        setTotalFramesCount(frames.length)

        for (const dataFrame of frames) {
          if (cancelled) return // stop computing for nothing, happens especially in dev because of strict mode double mount

          const blob = await new QRCodeStyling({
            type: "svg",
            data: decodeString(dataFrame),
            margin: 0,
            qrOptions: { mode: "Byte", errorCorrectionLevel: "L" },
            dotsOptions: { type: "square" },
            cornersSquareOptions: { type: "extra-rounded" },
            cornersDotOptions: { type: "dot" },
            image: talismanRedHandSvg,
            imageOptions: { hideBackgroundDots: true, imageSize: 0.7, margin: 5 },
          }).getRawData("svg")
          if (blob) qrCodeFrames.push(URL.createObjectURL(blob))
        }

        if (cancelled) return
      })()
    })

    return () => {
      cancelled = true
    }
  }, [data])

  useEffect(() => {
    const img = refImg.current
    if (!img || totalFramesCount === undefined) return

    let index = 0
    const interval = setInterval(() => {
      // array may change overtime, pick from ref
      const qrCodes = refQrCodes.current
      if (!qrCodes?.length) return

      index = (index + 1) % qrCodes.length
      img.src = qrCodes[index]
    }, 100)

    return () => clearInterval(interval)
  }, [totalFramesCount])

  return (
    <img
      ref={refImg}
      className={classNames("relative h-full w-full", totalFramesCount ? "block" : "hidden")}
    />
  )
}

// export as default module to make it possible to lazy import
export default RaptorQrCode
