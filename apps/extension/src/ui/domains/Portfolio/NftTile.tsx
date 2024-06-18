import { classNames } from "@talismn/util"
import { FC } from "react"

import { NetworksLogoStack } from "./AssetsTable/NetworksLogoStack"
import { NftImage } from "./NftImage"

export const NftTile: FC<{
  imageUrl: string | null
  label: string
  networkIds: string[]
  className?: string
  onClick: () => void
}> = ({ imageUrl, label, networkIds, className, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "text-body-secondary group flex size-full flex-col gap-4 overflow-hidden text-left",
        className
      )}
    >
      <div className="w-full grow overflow-hidden rounded-sm">
        <NftImage
          className="size-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
          src={imageUrl}
          alt={label ?? ""}
        />
      </div>
      <div className="flex w-full shrink-0 items-center gap-2 overflow-hidden">
        <div className="grow truncate text-base">{label}</div>
        <NetworksLogoStack className="shrink-0" networkIds={networkIds} />
      </div>
    </button>
  )
}
