import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { AlertTriangleIcon, ChevronLeftIcon, LockIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { ChangeEventHandler, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Drawer } from "talisman-ui"
import { Button, FormFieldInputText } from "talisman-ui"

import { PopupContent, PopupFooter, PopupLayout } from "../Layout/PopupLayout"

const ConfirmDrawer = ({
  isOpen,
  closeResetWallet,
}: {
  isOpen: boolean
  closeResetWallet: () => void
}) => {
  const { t } = useTranslation()
  const [confirmText, setConfirmText] = useState<string>("")
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    return () => {
      setConfirmText("")
    }
  }, [])

  const handleTextChange: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setConfirmText(e.target.value)
  }, [])

  const handleReset = useCallback(async () => {
    setResetting(true)
    // don't wait for the response here, or the normal onboarding tab will open
    api.resetWallet()
    window.close()
  }, [])

  const isMatch = useMemo(() => confirmText?.toLowerCase() === "reset wallet", [confirmText])

  return (
    <Drawer isOpen={isOpen} anchor="bottom">
      <div className="bg-grey-800 items-center rounded-t-xl p-12 pt-12">
        <div className="flex flex-col items-center gap-12 px-12 text-center">
          <div className="text-3xl">
            <AlertTriangleIcon className="text-brand-orange text-[4.8rem]" />
          </div>
          <div className="max-w-[30rem] font-bold leading-[2.2rem] text-white">
            {t("Are you sure you want to reset your Talisman wallet?")}
          </div>
        </div>
        <div className="text-body-secondary my-8 text-sm">
          <p className="px-4 text-center">
            {t(
              "Your current wallet, accounts and assets will be erased from Talisman. You will need to re-import your original account using your recovery (seed) phrase or private key."
            )}
          </p>
          <p className="mt-12 text-center">{t("Type 'Reset wallet' below to continue")}</p>
        </div>
        <FormFieldInputText onChange={handleTextChange} placeholder={t("Reset wallet")} />
        <div className="mt-12 flex flex-col gap-8">
          <Button
            type="submit"
            className="enabled:!bg-brand-orange hover:enabled:!bg-brand-orange/80 h-24 enabled:text-white"
            fullWidth
            onClick={handleReset}
            primary={isMatch}
            processing={resetting}
            disabled={!isMatch}
          >
            {t("Reset Wallet")}
          </Button>
          <Button className="h-24" fullWidth onClick={closeResetWallet}>
            {t("Cancel")}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

export const ResetWallet = ({ closeResetWallet }: { closeResetWallet: () => void }) => {
  const { t } = useTranslation()
  const { popupOpenEvent } = useAnalytics()
  const { open, isOpen } = useOpenClose()

  useEffect(() => {
    popupOpenEvent("reset wallet")
  }, [popupOpenEvent])

  return (
    <PopupLayout>
      <div className="text-body-secondary flex h-32 items-center justify-center px-12 pr-[16px]">
        <ChevronLeftIcon
          className="flex-shrink cursor-pointer text-lg hover:text-white"
          onClick={closeResetWallet}
        />
        <span className="flex-grow pr-[24px] text-center">{t("Reset Wallet")}</span>
      </div>
      <PopupContent>
        <div className="flex h-full flex-col items-center justify-end gap-16 pb-8">
          <LockIcon className="text-primary-500 text-[4.8rem]" />
          <div className="text-lg font-bold">{t("Forgot your password?")}</div>
          <div className="text-body-secondary space-y-12">
            <p className="text-center">
              {t(
                "This action will reset your current wallet, accounts and assets. There is no way for us to recover your password as it is only stored on your device. You can also try other passwords."
              )}
            </p>
            <p className="text-center">
              {t(
                "If you still want to reset your wallet, you will need to import your original recovery phrase. Proceed only if you have your recovery phrase."
              )}
            </p>
          </div>
        </div>
      </PopupContent>
      <PopupFooter className="flex flex-col gap-8">
        <Button fullWidth primary onClick={open} className="h-24">
          {t("Reset Wallet")}
        </Button>
        <Button fullWidth onClick={closeResetWallet} className="h-24">
          {t("Cancel")}
        </Button>
      </PopupFooter>
      <ConfirmDrawer isOpen={isOpen} closeResetWallet={closeResetWallet} />
    </PopupLayout>
  )
}
