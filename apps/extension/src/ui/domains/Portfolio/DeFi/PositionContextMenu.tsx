import type { DefiPosition } from "@core/domains/defi/exports"
import { getBlockExplorerUrls } from "@talismn/chaindata-provider"
import { MoreHorizontalIcon } from "@talismn/icons"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ui/components/ContextMenu"
import { useNetworkById } from "@ui/state/chaindata"
import { classNames } from "@ui/util/cn"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

export const PositionContextMenu: FC<{ position: DefiPosition; className?: string }> = ({
  position,
  className,
}) => {
  const { t } = useTranslation()
  const network = useNetworkById(position.networkId)

  const blockExplorerUrl = useMemo(() => {
    if (!position.poolAddress || !network?.blockExplorerUrls.length) return null
    return (
      getBlockExplorerUrls(network, { type: "address", address: position.poolAddress })[0] ?? null
    )
  }, [network, position.poolAddress])

  // dont display the menu if there is no action to provide
  if (!blockExplorerUrl && !position.defiUrl) return null

  return (
    <ContextMenu placement={"bottom-end"}>
      <ContextMenuTrigger className={classNames(className)} asChild>
        <div className="flex size-9.5 shrink-0 cursor-pointer items-center justify-center rounded text-body-secondary hover:bg-grey-750 hover:text-body">
          <MoreHorizontalIcon className="shrink-0" />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="z-50 flex w-min flex-col whitespace-nowrap rounded-sm border border-grey-800 bg-black px-2 py-3 text-left text-sm shadow-lg">
        {!!position.defiUrl && (
          <ContextMenuItem onClick={() => window.open(position.defiUrl!, "_blank")}>
            {t("Browse {{defiName}}", position)}
          </ContextMenuItem>
        )}
        {!!blockExplorerUrl && (
          <ContextMenuItem onClick={() => window.open(blockExplorerUrl, "_blank")}>
            {t("View on Block Explorer")}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
