import { PlusIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { ReactNode } from "react"
import { IconButton } from "talisman-ui"

type BuyTokensButtonProps = {
  shouldRenderSelected: boolean
  selectedItem: ReactNode
  label: string
  isDisabled: boolean
  onClick: () => void
  onClear: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}

export const BuyTokensButton = ({
  shouldRenderSelected,
  selectedItem,
  label,
  isDisabled,
  onClick,
  onClear,
}: BuyTokensButtonProps) => {
  return (
    <IconButton
      onClick={!isDisabled ? onClick : () => null}
      className={classNames(
        "border-grey-750 bg-grey-800 flex h-full w-[14rem] items-center gap-4 rounded-[12px] px-4 py-3",
        isDisabled && "cursor-not-allowed opacity-50",
      )}
    >
      {shouldRenderSelected ? (
        <div className="flex w-full items-center">
          {selectedItem}
          <div
            className="ml-auto"
            onClick={(e) => onClear(e)}
            role="button"
            tabIndex={0}
            onKeyDown={() => null}
          >
            <XIcon className="shrink-0 text-[2rem]" />
          </div>
        </div>
      ) : (
        <div className="flex w-full items-center gap-3">
          <div className="flex items-center justify-center rounded-full bg-[#D5FF5C] bg-opacity-10">
            <PlusIcon className="text-primary-500 m-[0.3rem] size-10" />
          </div>
          <div className="text-xs text-white">{label}</div>
        </div>
      )}
    </IconButton>
  )
}
