import { useOpenClose } from "talisman-ui"

import { DecodedCallComponent } from "../types"
import { SubSignDecodeButtonContent } from "./SubSignDecodeButtonContent"
import { SubSignDecodedCallModal } from "./SubSignDecodedCallModal"

export const SubSignDecodedCallButton: DecodedCallComponent<unknown> = ({
  sapi,
  decodedCall,
  payload,
}) => {
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <button
        type="button"
        className="bg-grey-900 hover:bg-grey-800 text-body-secondary rounded-xs left-align flex gap-4 truncate p-4 text-left"
        onClick={open}
      >
        <SubSignDecodeButtonContent sapi={sapi} decodedCall={decodedCall} payload={payload} />
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
