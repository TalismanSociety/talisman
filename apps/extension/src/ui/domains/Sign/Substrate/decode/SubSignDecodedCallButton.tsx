import { ChevronRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useOpenClose } from "talisman-ui"

import { DecodedCallComponent, SummaryButtonDisplayMode } from "../types"
import { SubSignDecodedCallButtonContent } from "./SubSignDecodedCallButtonContent"
import { SubSignDecodedCallDrawer } from "./SubSignDecodedCallDrawer"

export const SubSignDecodedButtonBase: DecodedCallComponent<
  unknown,
  { mode: SummaryButtonDisplayMode; onClick: () => void }
> = ({ sapi, decodedCall, payload, mode, onClick }) => {
  return (
    <button
      type="button"
      className={classNames(
        "bg-grey-850 hover:bg-grey-800 border-grey-700 text-body-secondary",
        "left-align group flex w-full items-center gap-4 overflow-x-hidden truncate rounded border pl-8 pr-4 text-left font-normal",
        mode === "multiline" && "leading-paragraph py-4",
        mode === "compact" && "h-[3.6rem]",
      )}
      onClick={onClick}
    >
      <div
        className={classNames(
          "grow align-baseline",
          mode === "compact" && "truncate",
          mode === "multiline" && "line-clamp-5 whitespace-normal",
        )}
      >
        <SubSignDecodedCallButtonContent
          sapi={sapi}
          decodedCall={decodedCall}
          payload={payload}
          mode={mode}
        />
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
        mode="multiline"
        onClick={open}
      />
      <SubSignDecodedCallDrawer
        sapi={sapi}
        decodedCall={decodedCall}
        payload={payload}
        isOpen={isOpen}
        onClose={close}
      />
    </>
  )
}
