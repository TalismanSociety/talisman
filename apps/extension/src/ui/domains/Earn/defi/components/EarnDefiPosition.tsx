import type { DefiPosition, DefiPositionItem } from "@core/domains/defi/exports"
import { ChevronLeftIcon } from "@talismn/icons"
import { IconButton } from "@ui/components/IconButton"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { PortfolioAccount } from "@ui/domains/Portfolio/AssetDetails/PortfolioAccount"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useDefiPosition } from "@ui/state/defi"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { EarnTypeBadge } from "../../components/EarnTypeBadge"
import { PositionContextMenu } from "./PositionContextMenu"
import { PositionItemAssetLogo } from "./PositionItemAssetLogo"
import { PositionItemTokens } from "./PositionItemTokens"
import { PositionItemType } from "./PositionItemType"
import { PositionSectionLabel, type PositionSectionType } from "./PositionSectionLabel"
import { PositionTotal } from "./PositionTotal"

export const EarnDefiPosition: FC<{ positionId: string | undefined }> = ({ positionId }) => {
  const position = useDefiPosition(positionId)

  if (!position) return null

  return (
    <div className="flex w-full flex-col gap-6 overflow-hidden">
      <DefiNavHeader position={position} />
      <DefiPositionHeader position={position} />
      <DefiPositionSection position={position} type="supplied" />
      <DefiPositionSection position={position} type="rewards" />
    </div>
  )
}

const DefiNavHeader: FC<{ position: DefiPosition }> = ({ position }) => {
  const { t } = useTranslation()
  const navigate = useNavigateWithQuery()

  return (
    <div className="flex h-28 w-full items-center gap-8 overflow-hidden">
      <div className="flex h-full grow items-center gap-4 overflow-hidden">
        <IconButton onClick={() => navigate("/earn", true)}>
          <ChevronLeftIcon />
        </IconButton>
        <AssetLogo url={position.defiLogoUrl} className="size-[2.25rem]" />
        <div className="flex h-full grow flex-col justify-center gap-2 overflow-hidden">
          <div className="flex w-full items-center gap-8 overflow-hidden">
            <div className="flex grow items-center overflow-hidden truncate text-body">
              <div className="truncate">{position.name}</div>
              <EarnTypeBadge className="shrink-0 text-xs">{position.type}</EarnTypeBadge>
            </div>
            <div className="shrink-0 text-body-secondary">{t("Total")}</div>
          </div>
          <div className="flex w-full items-center gap-8 overflow-hidden text-sm">
            <div className="grow truncate text-body-secondary">
              <PortfolioAccount address={position.address} />
            </div>
            <div className="shrink-0">
              <PositionTotal position={position} />
            </div>
          </div>
        </div>
      </div>
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
    <div className="flex flex-col gap-0 overflow-hidden rounded bg-grey-850 px-10">
      <div className="flex h-20 w-full items-center truncate font-bold">
        <PositionSectionLabel type={type} />
      </div>
      <div>
        {items.map((item: DefiPositionItem, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: legacy
          <DefiPositionItemRow key={idx} item={item} networkId={position.networkId} />
        ))}
      </div>
    </div>
  )
}

const DefiPositionItemRow: FC<{
  networkId: string
  item: DefiPositionItem
}> = ({ networkId, item }) => {
  return (
    <div className="flex h-32 w-full shrink-0 items-center gap-8">
      <PositionItemAssetLogo networkId={networkId} item={item} className="size-16 shrink-0" />
      <div className="flex grow flex-col justify-center gap-1 overflow-hidden text-sm">
        <div className="flex w-full justify-between overflow-hidden font-bold text-body">
          <div className="grow truncate">{item.name}</div>
          <div className="max-w-[50%] truncate">
            <PositionItemTokens item={item} />
          </div>
        </div>
        <div className="flex w-full justify-between overflow-hidden text-body-secondary text-sm">
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

const DefiPositionHeader: FC<{ position: DefiPosition }> = ({ position }) => {
  return (
    <div className="flex h-32 w-full items-center gap-8 rounded bg-grey-800 px-10">
      <div className="flex grow flex-col gap-2 overflow-hidden">
        <div className="truncate font-bold text-base text-body">{position.name}</div>
        <div className="flex max-w-full items-center gap-[0.3em] overflow-hidden text-body-secondary">
          <NetworkLogo networkId={position.networkId} className="size-8 shrink-0" />
          <NetworkName networkId={position.networkId} className="truncate text-sm" />
        </div>
      </div>
      <PositionContextMenu position={position} />
    </div>
  )
}
