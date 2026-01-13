import { RepeatIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"

import { useReverse } from "../swaps.api"

export const ReverseButton = () => {
  const reverse = useReverse()

  return (
    <div className="relative w-full">
      <button
        className={classNames(
          "absolute top-5 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "flex items-center justify-center",
          "rounded-full border border-black-secondary border-solid bg-[#2D3121] p-6 text-md text-primary",
          "transition-colors hover:bg-[#383d29]"
        )}
        onClick={reverse}
      >
        <RepeatIcon />
      </button>
    </div>
  )
}
