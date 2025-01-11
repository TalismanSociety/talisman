import { PlusIcon } from "@talismn/icons"
import { IconButton } from "talisman-ui"

type BuyTokensSelectPillProps = {
  label: string
}

export const BuyTokensSelectPill = ({ label }: BuyTokensSelectPillProps) => {
  return (
    <IconButton>
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center rounded-full bg-[#D5FF5C] bg-opacity-10">
          <PlusIcon className="text-primary-500 m-[0.3rem] size-10" />
        </div>
        <div className="text-xs text-white">{label}</div>
      </div>
    </IconButton>
  )
}
