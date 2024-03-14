import { AlertCircleIcon } from "@talismn/icons"
import { FC } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

export const CopyAddressExchangeWarning: FC<{
  isOpen: boolean
  onDismiss: () => void
  onContinue: () => void
}> = ({ isOpen, onDismiss, onContinue }) => {
  const { t } = useTranslation()

  return (
    <Drawer containerId="copy-address-modal" isOpen={isOpen} anchor="bottom" onDismiss={onDismiss}>
      <div className="bg-grey-800 flex w-full flex-col items-center rounded-t-xl p-12">
        <AlertCircleIcon className="text-primary-500 text-3xl" />
        <div className="text-md mt-12 font-bold">{t("Sending from an exchange?")}</div>
        <p className="text-body-secondary mt-8 text-center">
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
