import { SignerPayloadJSON } from "extension-core"
import { FC } from "react"
import { useOpenClose } from "talisman-ui"

import { DecodedCall, ScaleApi } from "@ui/util/scaleApi"

import { SubSignDecodedCallModal } from "./SubSignDecodedCallModal"

export const SubSignDecodedCallButton: FC<{
  sapi: ScaleApi
  decodedCall: DecodedCall
  payload: SignerPayloadJSON
}> = ({ sapi, decodedCall, payload }) => {
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <button
        type="button"
        className="bg-grey-900 hover:bg-grey-800 text-body-secondary rounded-xs left-align flex gap-4 truncate p-4 text-left"
        onClick={open}
      >
        {decodedCall.pallet} : {decodedCall.call}
      </button>
      <SubSignDecodedCallModal
        sapi={sapi}
        decodedCall={decodedCall}
        payload={payload}
        isOpen={isOpen}
        onClose={close}
      />
    </>
  )
}
