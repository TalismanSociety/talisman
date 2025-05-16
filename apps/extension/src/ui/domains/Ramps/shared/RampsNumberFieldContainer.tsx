import { classNames } from "@talismn/util"
import { FC, ReactNode } from "react"

export const RampsNumberFieldContainer: FC<{
  input: ReactNode
  button: ReactNode
  withFocusWithin?: boolean
}> = ({ input, button, withFocusWithin }) => (
  <div className="w-full overflow-hidden">
    <div
      className={classNames(
        "border-grey-750 bg-black-secondary flex h-[5.5rem] w-full justify-between overflow-hidden rounded-[12px] border-[1px] p-3 pl-8",
        withFocusWithin && "has-[input:focus]:border-grey-600",
      )}
    >
      <div className="flex grow flex-col justify-center truncate">{input}</div>
      <div className="shrink-0">{button}</div>
    </div>
  </div>
)
