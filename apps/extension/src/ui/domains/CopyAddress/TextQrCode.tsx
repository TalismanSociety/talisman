import QrCodeStyling from "@solana/qr-code-styling"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { talismanRedHandSvg } from "../Sign/Qr/constants"

export const TextQrCode = ({
  data,
  image = talismanRedHandSvg,
  imageOptions = {},
}: {
  data?: string
  image?: string
  imageOptions?: {
    hideBackgroundDots?: boolean | undefined
    imageSize?: number | undefined
    crossOrigin?: string | undefined
    margin?: number | undefined
  }
}) => {
  const [qrCode, setQrCode] = useState<string>()
  const [error, setError] = useState<Error>()
  const { t } = useTranslation()

  useEffect(() => {
    if (!data) return
    else setError(undefined)

    try {
      const styling = new QrCodeStyling({
        type: "svg",
        data,
        margin: 0,
        dotsOptions: { type: "dots" },
        cornersSquareOptions: { type: "extra-rounded" },
        cornersDotOptions: { type: "dot" },
        image,
        imageOptions: { hideBackgroundDots: true, imageSize: 0.7, margin: 5, ...imageOptions },
      })

      styling
        .getRawData("svg")
        .then((blob) => {
          if (blob) setQrCode(URL.createObjectURL(blob))
        })
        .catch(setError)
    } catch (err) {
      setError(err as Error)
    }
  }, [data, image, imageOptions])

  useEffect(() => {
    if (!error) return
    // eslint-disable-next-line no-console
    console.error("Failed to generate QR code", error, { data })
  }, [data, error])

  if (error)
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-alert-error relative flex h-full w-full flex-col items-center justify-center whitespace-pre-wrap bg-white">
            {t("Failed to generate QR")}
          </div>
        </TooltipTrigger>
        <TooltipContent>{error.toString()}</TooltipContent>
      </Tooltip>
    )
  if (!qrCode) return null

  // apply a key to prevent flickering of inner icon if changing chain
  return <img key={`${data}-${image}`} className="relative h-full w-full" src={qrCode} alt="" />
}
