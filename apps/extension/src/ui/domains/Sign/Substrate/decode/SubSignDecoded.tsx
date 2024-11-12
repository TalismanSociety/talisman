import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { SupportedCallsBatch } from "../batch/SubSignBatch"
import { SubSignDecodedBatch } from "./SubSignDecodedBatch"
import { SubSignDecodedCallButton } from "./SubSignDecodedCallButton"
import { SupportedCallBatch } from "./types"

export const SubSignDecoded = () => {
  const { t } = useTranslation()
  const { decodedCall, sapi } = usePolkadotSigningRequest()

  const isBatchCall = useMemo(
    () =>
      !!decodedCall &&
      SupportedCallsBatch.some(
        (supportedCall) =>
          supportedCall.pallet === decodedCall.pallet && supportedCall.call === decodedCall.call,
      ),
    [decodedCall],
  )

  if (!decodedCall || !sapi) return null

  return (
    <div className="flex w-full flex-col gap-4 px-3 text-left text-sm">
      <div className="text-body-inactive">
        {isBatchCall ? t("Batch content:") : t("Request content:")}
      </div>
      {isBatchCall ? (
        <SubSignDecodedBatch sapi={sapi} decodedCall={decodedCall as SupportedCallBatch} />
      ) : (
        <SubSignDecodedCallButton sapi={sapi} decodedCall={decodedCall} />
      )}
    </div>
  )
}
