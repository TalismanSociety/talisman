import { StarIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC } from "react"

import { NetworksLogoStack } from "./AssetsTable/NetworksLogoStack"
import { NftImage } from "./NftImage"

export const NftTile: FC<{
  imageUrl: string | null
  count?: number | null
  label: string
  networkIds: string[]
  isFavorite?: boolean
  className?: string
  onClick: () => void
}> = ({ imageUrl, count, label, networkIds, isFavorite, className, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "text-body-secondary group relative flex size-full flex-col gap-4 overflow-hidden text-left",
        className
      )}
    >
      <div className="relative w-full grow overflow-hidden rounded-sm">
        <NftImage
          className="size-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
          src={imageUrl}
          alt={label ?? ""}
        />
        {isFavorite && (
          <StarIcon className="absolute right-[4%] top-[4%] fill-[#D5FF5C] stroke-[#D5FF5C] opacity-80" />
        )}
        {!!count && count > 1 && (
          <div className="bg-grey-700 text-body-secondary absolute bottom-[4%] right-[4%] flex size-10 min-w-[1em] items-center justify-center rounded-full p-1 text-xs opacity-80">
            <div>{count > 9 ? "9+" : count}</div>
          </div>
        )}
      </div>
      <div className="flex w-full shrink-0 items-center gap-2 overflow-hidden">
        <div className="grow truncate text-base">{label}</div>
        <NetworksLogoStack className="shrink-0" networkIds={networkIds} />
      </div>
    </button>
  )
}
