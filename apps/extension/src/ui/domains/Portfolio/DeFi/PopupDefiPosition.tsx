import { DefiPosition, DefiPositionItem } from "extension-core"
import { FC, useMemo } from "react"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { useDefiPosition } from "@ui/state"

import { PositionContextMenu } from "./PositionContextMenu"
import { PositionItemAssetLogo } from "./PositionItemAssetLogo"
import { PositionItemTokens } from "./PositionItemTokens"
import { PositionItemType } from "./PositionItemType"
import { PositionSectionLabel, PositionSectionType } from "./PositionSectionLabel"

export const PopupDefiPosition: FC<{ positionId: string | undefined }> = ({ positionId }) => {
  const position = useDefiPosition(positionId)

  if (!position) return null

  return (
    <div className="flex w-full flex-col gap-6">
      <DefiPositionActionRow position={position} />
      <DefiPositionSection position={position} type="supplied" />
      <DefiPositionSection position={position} type="rewards" />
    </div>
  )
}

const DefiPositionActionRow: FC<{ position: DefiPosition }> = ({ position }) => {
  const name = useMemo(
    () =>
      position.name.startsWith(position.defiName)
        ? position.name.substring(position.defiName.length).trim()
        : position.name,
    [position],
  )

  return (
    <div className="bg-grey-800 flex h-28 w-full items-center gap-4 overflow-hidden rounded-sm border-transparent px-6">
      <AssetLogo url={position.defiLogoUrl} className="size-16" />
      <div className="flex grow flex-col justify-center gap-2 overflow-hidden pr-8">
        <div className="flex grow items-center gap-3">
          <div className="text-body truncate text-sm font-bold">{name}</div>
        </div>
        <div className="flex w-full items-center gap-2 overflow-hidden text-xs">
          <NetworkLogo networkId={position.networkId} />
          <span className="text-body-secondary truncate">
            <NetworkName networkId={position.networkId} />
          </span>
        </div>
      </div>
      <PositionContextMenu position={position} />
    </div>
  )
}

const DefiPositionSection: FC<{ position: DefiPosition; type: PositionSectionType }> = ({
  position,
  type,
}) => {
  const items = useMemo(() => {
    switch (type) {
      case "supplied":
        return position.breakdown.filter((item) => item.type !== "reward") || []
      case "rewards":
        return position.breakdown.filter((item) => item.type === "reward") || []
    }
  }, [position.breakdown, type])

  if (!items.length) return null

  return (
    <div className="bg-black-secondary rounded-sm">
      <div className="flex h-[3.8rem] w-full items-center">
        <div className="px-6 text-sm font-bold text-white">
          <PositionSectionLabel type={type} />
        </div>
      </div>
      {items.map((item: DefiPositionItem, idx) => (
        <DefiPositionItemRow key={idx} item={item} networkId={position.networkId} />
      ))}
    </div>
  )
}

const DefiPositionItemRow: FC<{
  networkId: string
  item: DefiPositionItem
}> = ({ networkId, item }) => {
  return (
    <div className="flex h-28 w-full items-center gap-4 overflow-hidden px-6">
      <PositionItemAssetLogo networkId={networkId} item={item} className="size-16" />
      <div className="flex w-full grow flex-col gap-2 overflow-hidden">
        <div className="text-body flex w-full items-center justify-between gap-6 overflow-hidden text-sm font-bold">
          <div className="grow truncate">{item.name}</div>
          <div className="max-w-[50%] truncate">
            <PositionItemTokens item={item} />
          </div>
        </div>
        <div className="text-body-secondary flex w-full items-center justify-between gap-6 overflow-hidden text-xs font-normal">
          <div className="grow truncate">
            <PositionItemType type={item.type} />
          </div>
          <div className="shrink-0">
            <FiatFromUsd amount={item.valueUsd} isBalance />
          </div>
        </div>
      </div>
    </div>
  )
}
