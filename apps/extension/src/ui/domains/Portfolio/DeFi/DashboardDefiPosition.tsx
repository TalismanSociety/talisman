import { classNames } from "@talismn/util"
import { DefiPosition, DefiPositionItem } from "extension-core"
import { log } from "extension-shared"
import { FC, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { Breadcrumb } from "@talisman/components/Breadcrumb"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useDefiPosition } from "@ui/state"

import { PortfolioAccount } from "../AssetDetails/PortfolioAccount"
import { PositionContextMenu } from "./PositionContextMenu"
import { PositionItemTokens } from "./PositionItemTokens"
import { PositionItemType } from "./PositionItemType"
import { PositionTotal } from "./PositionTotal"

export const DashboardDefiPosition: FC<{ positionId: string | undefined }> = ({ positionId }) => {
  const position = useDefiPosition(positionId)

  useEffect(() => {
    log.debug("[DeFi] position", position)
  }, [position])

  if (!position) return null

  return (
    <>
      <DefiPositionBreadcrumb position={position} />
      <DefiPositionHeader position={position} />
      <DefiPositionContainer position={position} />
    </>
  )
}

const DefiPositionContainer: FC<{ position: DefiPosition }> = ({ position }) => {
  return (
    <div>
      <div
        className={classNames(
          "bg-grey-800 flex h-[6.6rem] w-full items-center gap-8 overflow-hidden border-transparent px-8",
          position.breakdown.length ? "rounded-t-sm" : "rounded",
        )}
      >
        <AssetLogo url={position.defiLogoUrl} className="size-16" />
        <div className="flex grow flex-col justify-center gap-2 overflow-hidden pr-8">
          <div className="flex grow items-center gap-3">
            <div className="text-body truncate font-bold">{position.name}</div>
          </div>
          <div className="flex w-full items-center gap-2 overflow-hidden">
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
        "bg-grey-850 flex h-[6.6rem] w-full items-center gap-8 overflow-hidden px-8",
        roundedBottom && "rounded-b-sm",
      )}
    >
      <AssetLogo url={item.logo} className="size-16" />
      <div className="flex w-full grow flex-col gap-2 overflow-hidden">
        <div className="text-body flex w-full items-center justify-between gap-8 overflow-hidden font-bold">
          <div className="grow truncate">{item.name}</div>
          <div className="max-w-[50%] truncate">
            <PositionItemTokens item={item} />
          </div>
        </div>
        <div className="text-body-secondary flex w-full items-center justify-between gap-8 overflow-hidden font-normal">
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

const DefiPositionBreadcrumb: FC<{ position: DefiPosition }> = ({ position }) => {
  const { t } = useTranslation()

  const navigate = useNavigateWithQuery()

  const items = useMemo(() => {
    return [
      {
        label: t("All Positions"),
        onClick: () => navigate("/portfolio/defi"),
      },
      {
        label: <div className="text-body font-bold">{position.name}</div>,
        onClick: undefined,
      },
    ]
  }, [t, position.name, navigate])

  return <Breadcrumb items={items} />
}

const DefiPositionHeader: FC<{ position: DefiPosition }> = ({ position }) => {
  const { t } = useTranslation()

  return (
    <div className="bg-grey-850 text-body-secondary flex h-40 w-full items-center justify-between rounded px-8 text-base">
      <div className="flex h-full flex-col justify-center gap-4">
        <div>{t("Account")}</div>
        <div className="text-body font-bold">
          <PortfolioAccount address={position.address} />
        </div>
      </div>
      <div className="flex h-full flex-col justify-center gap-4 text-right">
        <div>{t("Position Value")}</div>
        <div className="text-body font-bold">
          <PositionTotal position={position} />
        </div>
      </div>
    </div>
  )
}
