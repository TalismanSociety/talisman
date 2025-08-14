import { classNames } from "@talismn/util"
import { DefiPosition, DefiPositionItem } from "extension-core"
import { log } from "extension-shared"
import { FC, useEffect, useMemo } from "react"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { useDefiPosition } from "@ui/state"

import { PositionContextMenu } from "./PositionContextMenu"
import { PositionItemTokens } from "./PositionItemTokens"
import { PositionItemType } from "./PositionItemType"

export const PopupDefiPosition: FC<{ positionId: string | undefined }> = ({ positionId }) => {
  const position = useDefiPosition(positionId)

  // TODO remove
  useEffect(() => {
    log.debug("[DeFi] position", position)
  }, [position])

  // TODO message if empty ?
  if (!position) return null

  return <DefiPositionContainer position={position} />
}

const DefiPositionContainer: FC<{ position: DefiPosition }> = ({ position }) => {
  const name = useMemo(
    () =>
      position.name.startsWith(position.defiName)
        ? position.name.substring(position.defiName.length).trim()
        : position.name,
    [position],
  )

  return (
    <div>
      <div
        className={classNames(
          "bg-grey-800 flex h-28 w-full items-center gap-4 overflow-hidden border-transparent px-6",
          position.breakdown.length ? "rounded-t-sm" : "rounded",
        )}
      >
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

      {position.breakdown.map((item: DefiPositionItem, idx, arr) => (
        <DefiPositionItemRow key={idx} item={item} roundedBottom={idx === arr.length - 1} />
      ))}
    </div>
  )
}

const DefiPositionItemRow: FC<{ item: DefiPositionItem; roundedBottom: boolean }> = ({
  item,
  roundedBottom,
}) => {
  return (
    <div
      className={classNames(
        "bg-grey-850 flex h-28 w-full items-center gap-4 overflow-hidden px-6",
        roundedBottom && "rounded-b-sm",
      )}
    >
      <AssetLogo url={item.logo} className="size-16" />
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
