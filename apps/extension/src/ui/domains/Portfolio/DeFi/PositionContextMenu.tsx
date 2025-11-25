import { getBlockExplorerUrls } from "@talismn/chaindata-provider"
import { MoreHorizontalIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { DefiPosition } from "extension-core"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "talisman-ui"

import { useNetworkById } from "@ui/state"

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
        <div className="hover:bg-grey-750 text-body-secondary hover:text-body flex size-[3.8rem] shrink-0 cursor-pointer items-center justify-center rounded">
          <MoreHorizontalIcon className="shrink-0" />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left text-sm shadow-lg">
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
