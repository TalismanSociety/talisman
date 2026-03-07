import { AlertCircleIcon } from "@talismn/icons"
import { Button, Drawer } from "@ui/talisman-ui"
import type { FC } from "react"
import { Trans, useTranslation } from "react-i18next"

export const CopyAddressExchangeWarning: FC<{
  isOpen: boolean
  onDismiss: () => void
  onContinue: () => void
}> = ({ isOpen, onDismiss, onContinue }) => {
  const { t } = useTranslation()

  return (
    <Drawer containerId="copy-address-modal" isOpen={isOpen} anchor="bottom" onDismiss={onDismiss}>
      <div className="flex w-full flex-col items-center rounded-t-xl bg-grey-800 p-12">
        <AlertCircleIcon className="text-3xl text-primary-500" />
        <div className="mt-12 font-bold text-md">{t("Receiving from an exchange?")}</div>
        <p className="mt-8 text-center text-body-secondary">
          {t("Generic substrate addresses are often incompatible with exchanges.")}
          <br />
          <Trans
            t={t}
            defaults="Talisman recommends you use a <Highlight>network specific address</Highlight>. Always check with your exchange before sending funds."
            components={{
              Highlight: <span className="text-body" />,
            }}
          />
        </p>
        <Button className="mt-12" primary fullWidth onClick={onContinue}>
          {t("Continue")}
        </Button>
      </div>
    </Drawer>
  )
}
