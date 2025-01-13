import { ChevronDownIcon, PlusIcon } from "@talismn/icons"
import { ReactNode } from "react"
import { IconButton } from "talisman-ui"

type BuyTokensButtonProps = {
  onClick: () => void
  shouldRenderSelected: boolean
  selectedItem: ReactNode
  label: string
}

export const BuyTokensButton = ({
  onClick,
  shouldRenderSelected,
  selectedItem,
  label,
}: BuyTokensButtonProps) => {
  return (
    <IconButton
      onClick={onClick}
      className="border-grey-750 bg-grey-800 flex h-full w-[16rem] items-center gap-4 rounded-[12px] px-3 py-3"
    >
      {shouldRenderSelected ? (
        <>{selectedItem}</>
      ) : (
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center justify-center rounded-full bg-[#D5FF5C] bg-opacity-10">
            <PlusIcon className="text-primary-500 m-[0.3rem] size-10" />
          </div>
          <div className="text-xs text-white">{label}</div>
          <ChevronDownIcon className="shrink-0 text-[2rem]" />
        </div>
      )}
    </IconButton>
  )
}
