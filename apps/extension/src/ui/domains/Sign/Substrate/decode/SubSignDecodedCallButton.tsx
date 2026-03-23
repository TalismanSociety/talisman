import { ChevronRightIcon } from "@talismn/icons"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { cn } from "@ui/util/cn"
import type { DecodedCallComponent, SummaryButtonDisplayMode } from "../types"
import { SubSignDecodedCallButtonContent } from "./SubSignDecodedCallButtonContent"
import { SubSignDecodedCallDrawer } from "./SubSignDecodedCallDrawer"

export const SubSignDecodedButtonBase: DecodedCallComponent<
  unknown,
  { mode: SummaryButtonDisplayMode; onClick: () => void }
> = ({ sapi, decodedCall, payload, mode, onClick }) => {
  return (
    <button
      type="button"
      className={cn(
        "border-grey-700 bg-grey-850 text-body-secondary hover:bg-grey-800",
        "group left-align flex w-full items-center gap-4 overflow-x-hidden truncate rounded border pr-4 pl-8 text-left font-normal",
        mode === "multiline" && "py-4 leading-paragraph",
        mode === "compact" && "h-[2.25rem]"
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "grow align-baseline",
          mode === "compact" && "truncate",
          mode === "multiline" && "line-clamp-5 whitespace-normal"
        )}
      >
        <SubSignDecodedCallButtonContent
          sapi={sapi}
          decodedCall={decodedCall}
          payload={payload}
          mode={mode}
        />
      </div>
      <ChevronRightIcon className="shrink-0 text-base text-body-secondary group-hover:text-body" />
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
