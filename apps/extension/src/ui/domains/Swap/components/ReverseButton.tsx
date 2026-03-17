import { RepeatIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import type { FC } from "react"
import { useSwap } from "../SwapProvider"

export const ReverseButton: FC<{ className?: string }> = ({ className }) => {
  const { reverse } = useSwap()

  return (
    <button
      type="button"
      className={classNames(
        "flex size-24 items-center justify-center",
        "rounded-full border-[3px] border-grey-900 bg-[#2d3121] text-primary",
        "transition-colors hover:bg-[#383d29]",
        className
      )}
      onClick={reverse}
    >
      <RepeatIcon className="text-[20px]" />
    </button>
  )
}
