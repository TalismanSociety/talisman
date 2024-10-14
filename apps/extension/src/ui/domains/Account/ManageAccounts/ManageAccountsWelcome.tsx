import { XIcon } from "@talismn/icons"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Checkbox, Drawer, IconButton, Modal, useOpenClose } from "talisman-ui"

import { useAccountsCatalog } from "@ui/hooks/useAccountsCatalog"
import { useAppState } from "@ui/hooks/useAppState"
import { IS_POPUP } from "@ui/util/constants"

import imgWelcome from "./welcome.png"

export const ManageAccountsWelcome = () => {
  const [hideDrawer, setHideDrawer] = useAppState("hideManageAccountsWelcomeDrawer")
  const { open, close, isOpen } = useOpenClose()

  const catalog = useAccountsCatalog()
  const hasFolders = useMemo(
    () => [...catalog.portfolio, ...catalog.watched].some((a) => a.type === "folder"),
    [catalog]
  )

  const handleClose = useCallback(
    (dontShowAgain: boolean) => {
      if (dontShowAgain) setHideDrawer(true)
      close()
    },
    [close, setHideDrawer]
  )

  useEffect(() => {
    if (hasFolders && !hideDrawer) setHideDrawer(true)
    else if (!hideDrawer && !hasFolders) open()
  }, [hasFolders, hideDrawer, open, setHideDrawer])

  return IS_POPUP ? (
    <Drawer anchor={"bottom"} containerId="main" isOpen={isOpen} onDismiss={close}>
      <DrawerContent onClose={handleClose} onDismiss={close} />
    </Drawer>
  ) : (
    <Modal isOpen={isOpen} onDismiss={close}>
      <DrawerContent onClose={handleClose} onDismiss={close} />
    </Modal>
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
    <div className="border-grey-850 flex w-full max-w-[74rem] flex-col gap-8 rounded-t-xl border-t bg-black p-12">
      <div className="flex w-full justify-between py-4">
        <div className="text-md text-body font-bold">{t("Stay organised with folders")}</div>
        <IconButton onClick={onDismiss}>
          <XIcon />
        </IconButton>
      </div>
      <img src={imgWelcome} alt="welcome" className="aspect-[705/232]" />
      <p className="text-body-secondary text-sm">
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
      <Button primary fullWidth onClick={handleCloseClick}>
        {t("Get Started")}
      </Button>
    </div>
  )
}
