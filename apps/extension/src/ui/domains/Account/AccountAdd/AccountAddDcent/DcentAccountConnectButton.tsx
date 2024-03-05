import { notify } from "@talisman/components/Notifications"
import { AlertCircleIcon, CheckCircleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { log } from "extension-shared"
import { FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger, useOpenClose } from "talisman-ui"

import { DcentAccountConnectModal } from "./DcentAccountConnectModal"
import { useDcentAccountConnect } from "./useDcentAccountConnect"
import { DcentAccountInfo } from "./util"

export const DcentAccountConnectButton: FC<{
  accountInfo: DcentAccountInfo
  address: string
  className?: string
}> = ({ accountInfo, address, className }) => {
  const { t } = useTranslation("admin")
  const { status, connect, isConnected } = useDcentAccountConnect(accountInfo, address)
  const account = useAccountByAddress(address)
  const { isOpen, open, close } = useOpenClose()

  const [isUpdating, setIsUpdating] = useState(false)
  const handleClick = useCallback(async () => {
    if (isUpdating) return

    switch (status) {
      case "not-connected": {
        open()
        break
      }

      case "update-required": {
        setIsUpdating(true)
        try {
          await connect(account?.name ?? accountInfo.name)
        } catch (err) {
          notify({
            type: "error",
            title: t("Failed to update"),
            subtitle: t("Could not sync with device tokens"),
          })
          log.error(err)
        }
        setIsUpdating(false)
        break
      }
    }
  }, [account?.name, accountInfo.name, connect, isUpdating, open, status, t])

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            disabled={status === "connected"}
            className={classNames(
              "flex h-[3rem] min-w-[14rem] items-center justify-center gap-[0.5em] rounded text-sm font-light",
              !isConnected && "bg-primary-500 enabled:hover:bg-primary-700 text-black",
              isConnected &&
                " text-body enabled:hover:bg-body border-body disabled:text-body-disabled disabled:border-body-disabled border  bg-black enabled:hover:text-black disabled:cursor-not-allowed",
              className
            )}
          >
            {status === "not-connected" && <span>{t("Connect")}</span>}
            {status === "connected" && (
              <>
                <span>{t("Connected")}</span>
                <CheckCircleIcon className="text-primary/50 text-base" />
              </>
            )}
            {status === "update-required" && (
              <>
                <span>{t("Update")}</span>
                <AlertCircleIcon className="text-base" />
              </>
            )}
          </button>
        </TooltipTrigger>
        {status === "update-required" && (
          <TooltipContent>{t("Synchronize tokens for this account.")}</TooltipContent>
        )}
      </Tooltip>
      <DcentAccountConnectModal
        isOpen={isOpen}
        defaultName={accountInfo.name}
        address={address}
        connect={connect}
        onClose={close}
      />
    </>
  )
}
