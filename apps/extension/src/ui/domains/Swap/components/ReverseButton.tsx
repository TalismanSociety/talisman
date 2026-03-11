import { ArrowDownIcon, RepeatIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"

import { useSwap } from "../SwapProvider"

export const ReverseButton = ({ hasError }: { hasError?: boolean }) => {
  const { reverse } = useSwap()

  return (
    <div className="relative z-10 -my-[18px] flex justify-center">
      <button
        type="button"
        className={classNames(
          "flex h-[48px] w-[48px] items-center justify-center",
          "rounded-full border-[3px] border-grey-900 bg-[#2d3121] text-primary",
          "transition-colors hover:bg-[#383d29]"
        )}
        onClick={reverse}
      >
        {hasError ? (
          <ArrowDownIcon className="text-[20px]" />
        ) : (
          <RepeatIcon className="text-[20px]" />
        )}
      </button>
    </div>
  )
}
