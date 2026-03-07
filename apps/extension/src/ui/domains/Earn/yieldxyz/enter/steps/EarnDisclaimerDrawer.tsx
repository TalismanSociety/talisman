import { TERMS_OF_USE_URL } from "@common/constants"
import { useAppState } from "@ui/state/app"
import { Button } from "@ui/talisman-ui/components/Button"
import { Drawer } from "@ui/talisman-ui/components/Drawer"
import type { FC, PropsWithChildren } from "react"
import { Trans, useTranslation } from "react-i18next"

type EarnDisclaimerDrawerProps = {
  isOpen: boolean
  onAccept: () => void
  onCancel: () => void
}

export const EarnDisclaimerDrawer: FC<EarnDisclaimerDrawerProps> = ({
  isOpen,
  onAccept,
  onCancel,
}) => {
  const { t } = useTranslation()
  const [, setHideDisclaimer] = useAppState("hideEarnDisclaimer")

  return (
    <Drawer anchor="bottom" isOpen={isOpen} containerId="earn-modal">
      <div className="flex w-full flex-col items-center gap-8 rounded-t-xl bg-grey-850 p-12">
        <div className="font-bold text-body">{t("Accept Terms to Continue")}</div>
        <p className="text-body-secondary text-sm">
          <Trans
            t={t}
            defaults="This is your first time entering a DeFi position through Talisman. By clicking Accept, you confirm that you understand the risks and agree to the <Link>Terms and Conditions</Link>."
            components={{
              Link: <TermsLink />,
            }}
          />
        </p>
        <div className="grid w-full grid-cols-2 gap-8">
          <Button onClick={onCancel}>{t("Cancel")}</Button>
          <Button
            primary
            onClick={() => {
              setHideDisclaimer(true)
              onAccept()
            }}
          >
            {t("Accept")}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

const TermsLink: FC<PropsWithChildren> = ({ children }) => (
  <button
    type="button"
    className="inline text-white underline"
    onClick={() => window.open(TERMS_OF_USE_URL, "_blank", "noopener noreferrer")}
  >
    {children}
  </button>
)
