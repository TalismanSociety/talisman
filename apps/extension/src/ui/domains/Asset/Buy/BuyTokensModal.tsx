import { BANXA_URL } from "@core/constants"
import { ExternalLinkIcon } from "@talisman/theme/icons"
import { useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, ModalDialog } from "talisman-ui"
import { Modal } from "talisman-ui"

import { ReactComponent as BanxaLogo } from "./BanxaLogo.svg"
import { useBuyTokensModal } from "./BuyTokensModalContext"

// This control is injected directly in the layout of dashboard
export const BuyTokensModal = () => {
  const { t } = useTranslation()
  const { isOpen, close } = useBuyTokensModal()

  const handleGoToBanxa = useCallback(() => {
    window.open(BANXA_URL, "_blank")
    close()
  }, [close])

  return (
    <Modal isOpen={isOpen} onDismiss={close}>
      <ModalDialog className="border-grey-800 text-body-secondary w-[54rem] bg-black pt-10 [&>header]:hidden">
        <div className="text-center">
          <div className="text-body text-lg font-bold">{t("Buy Crypto")}</div>
          <div className="mt-[0.3rem] flex items-center justify-center gap-[0.5em] text-xs font-light">
            <div>{t("Talisman recommends")}</div>{" "}
            <BanxaLogo className="inline aspect-auto w-[5rem]" />
          </div>
        </div>
        <div className="my-16 space-y-4">
          <Trans
            t={t}
            defaults="<p>You will now be redirected to <Highlight>Banxa</Highlight>, an external link outside of Talisman, where you can securely purchase crypto.</p><p>Are you sure you want to proceed?</p>"
            components={{ Highlight: <span className="text-body font-bold" />, p: <p /> }}
          />
        </div>
        <div className="grid grid-cols-2 gap-8">
          <Button type="button" onClick={close}>
            {t("Stay Here")}
          </Button>
          <Button type="button" onClick={handleGoToBanxa} primary icon={ExternalLinkIcon}>
            {t("Go to Banxa")}
          </Button>
        </div>
      </ModalDialog>
    </Modal>
  )
}
