import { Placement } from "@floating-ui/react"
import { CopyIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useChainByGenesisHash } from "@ui/state"

import { useCopyAddressModal } from "../CopyAddress"
import { AccountIcon, AccountIconProps } from "./AccountIcon"

export const AccountIconCopyAddressButton: FC<
  AccountIconProps & { tooltipPlacement?: Placement }
> = ({ address, genesisHash, className, type, tooltipPlacement = "bottom-start" }) => {
  const { t } = useTranslation()
  const chain = useChainByGenesisHash(genesisHash)
  const { open } = useCopyAddressModal()

  const handleAvatarClick = useCallback(() => {
    open({
      address,
      networkId: chain?.id,
    })
  }, [address, chain?.id, open])

  return (
    <Tooltip placement={tooltipPlacement}>
      <TooltipTrigger
        type="button"
        onClick={handleAvatarClick}
        className={classNames(
          "text-body size-[1em] shrink-0 rounded-full",
          "[&:hover>.copy-overlay]:opacity-100", // show overlay while hovering
          "[&:hover_.orb-type]:hidden", // hide orb type svg while showing overlay
          className,
        )}
      >
        <AccountIcon type={type} address={address} genesisHash={genesisHash} />
        <div
          className={classNames(
            "copy-overlay",
            "absolute left-0 top-0 flex size-full items-center justify-center rounded-full opacity-0",
            "bg-[radial-gradient(rgba(90,90,90,0.6),rgba(90,90,90,0.6),rgba(90,90,90,0.1))]",
          )}
        >
          <CopyIcon className="text-[0.5em]" />
        </div>
      </TooltipTrigger>
      <TooltipContent>{t("Copy address")}</TooltipContent>
    </Tooltip>
  )
}
