import { ChevronRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useOpenClose } from "talisman-ui"

import { DecodedCallComponent } from "../types"
import { SubSignDecodeButtonContent } from "./SubSignDecodeButtonContent"
import { SubSignDecodedCallModal } from "./SubSignDecodedCallModal"

export const SubSignDecodedButtonBase: DecodedCallComponent<unknown, { onClick: () => void }> = ({
  sapi,
  decodedCall,
  payload,
  onClick,
}) => {
  return (
    <button
      type="button"
      className={classNames(
        "bg-grey-850 hover:bg-grey-800 border-grey-700 text-body-secondary",
        "left-align group flex h-[3.6rem] w-full items-center gap-4 overflow-hidden truncate rounded border pl-8 pr-4 text-left font-normal",
      )}
      onClick={onClick}
    >
      <div className="grow truncate align-baseline">
        <SubSignDecodeButtonContent sapi={sapi} decodedCall={decodedCall} payload={payload} />
      </div>
      <ChevronRightIcon className="text-body-secondary group-hover:text-body shrink-0 text-base" />
    </button>
  )
}

export const SubSignDecodedCallButton: DecodedCallComponent<unknown> = ({
  sapi,
  decodedCall,
  payload,
}) => {
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <SubSignDecodedButtonBase
        sapi={sapi}
        decodedCall={decodedCall}
        payload={payload}
        onClick={open}
      />
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
