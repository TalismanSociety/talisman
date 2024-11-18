import { isJsonPayload } from "extension-core"
import { useTranslation } from "react-i18next"

import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { isBatchCall } from "../types"
import { SubSignDecodedBatch } from "./SubSignDecodedBatch"
import { SubSignDecodedCallButton } from "./SubSignDecodedCallButton"

export const SubSignDecoded = () => {
  const { t } = useTranslation()
  const { decodedCall, sapi, payload } = usePolkadotSigningRequest()

  if (!decodedCall || !sapi || !isJsonPayload(payload)) return null

  return (
    <div className="flex w-full flex-col gap-4 px-3 text-left text-sm">
      {isBatchCall(decodedCall) ? (
        <>
          <div className="text-body-inactive">{t("Batch content")}</div>
          <SubSignDecodedBatch sapi={sapi} decodedCall={decodedCall} payload={payload} />
        </>
      ) : (
        <>
          <div className="text-body-inactive">{t("Request content")}</div>
          <SubSignDecodedCallButton sapi={sapi} decodedCall={decodedCall} payload={payload} />
        </>
      )}
    </div>
  )
}
