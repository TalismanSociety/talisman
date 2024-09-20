import { XIcon } from "@talismn/icons"
import { FC, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Checkbox, Drawer, IconButton, useOpenClose } from "talisman-ui"

import { useAppState } from "@ui/hooks/useAppState"

import imgWelcome from "./welcome.png"

export const ManageAccountsWelcomeDrawer = () => {
  const { open, close, isOpen } = useOpenClose()
  const [hideDrawer, setHideDrawer] = useAppState("hideManageAccountsWelcomeDrawer")

  const handleClose = useCallback(
    (dontShowAgain: boolean) => {
      if (dontShowAgain) setHideDrawer(true)
      close()
    },
    [close, setHideDrawer]
  )

  useEffect(() => {
    if (!hideDrawer) open()
  }, [hideDrawer, open])

  return (
    <Drawer anchor="bottom" containerId="main" isOpen={isOpen} onDismiss={close}>
      <DrawerContent onClose={handleClose} onDismiss={close} />
    </Drawer>
  )
}

const DrawerContent: FC<{
  onClose: (dontShowThisAgain: boolean) => void
  onDismiss: () => void
}> = ({ onClose, onDismiss }) => {
  const { t } = useTranslation()
  const [dontShowThisAgain, setDontShowThisAgain] = useState(false)

  const handleCloseClick = useCallback(() => {
    onClose(dontShowThisAgain)
  }, [dontShowThisAgain, onClose])

  return (
    <div className="border-grey-850 flex w-full flex-col rounded-t-xl border-t bg-black p-12">
      <div className="mb-12 flex w-full justify-between">
        <div className="text-md text-body font-bold">{t("Stay organised with folders")}</div>
        <IconButton onClick={onDismiss}>
          <XIcon />
        </IconButton>
      </div>
      <img src={imgWelcome} alt="welcome" className="aspect-[705/232]" />
      <p className="text-body-secondary my-8 text-sm">
        {t(
          "Talisman lets you neatly organise and group your accounts into folders. Keep everything in one place for easy access and enhanced control over your assets."
        )}
      </p>
      <div className="text-right">
        <Checkbox
          onChange={(e) => setDontShowThisAgain(e.target.checked)}
          className="flex-row-reverse text-sm"
        >
          {t("Don't show this again")}
        </Checkbox>
      </div>
      <Button primary fullWidth className="mt-8" onClick={handleCloseClick}>
        {t("Get Started")}
      </Button>
    </div>
  )
}
