import { CopyIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"

import { useCopyAddressModal } from "../CopyAddress"
import { AccountIcon, AccountIconProps } from "./AccountIcon"

export const AccountIconCopyAddressButton: FC<AccountIconProps> = ({
  address,
  genesisHash,
  className,
  type,
}) => {
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
    <Tooltip>
      <TooltipTrigger
        type="button"
        onClick={handleAvatarClick}
        className={classNames(
          "size-[1em] shrink-0 rounded-full",
          "[&:hover>.copy-overlay]:opacity-100 [&>.copy-overlay]:opacity-0",
          "text-body-secondary",
          className
        )}
      >
        <AccountIcon type={type} address={address} genesisHash={genesisHash} />
        <div
          className={classNames(
            "absolute left-0 top-0 flex  size-full items-center justify-center rounded-full",
            "copy-overlay opacity-0 transition-opacity",
            "bg-[radial-gradient(rgba(0,0,0,0.6),rgba(0,0,0,0.6),rgba(0,0,0,0.1))]"
          )}
        >
          <CopyIcon className="text-[0.5em]" />
        </div>
      </TooltipTrigger>
      <TooltipContent>{t("Copy address")}</TooltipContent>
    </Tooltip>
  )
}
