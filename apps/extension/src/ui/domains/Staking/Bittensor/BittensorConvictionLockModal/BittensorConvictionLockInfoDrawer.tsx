import { Button } from "@ui/components/Button"
import { Checkbox } from "@ui/components/Checkbox"
import { Drawer } from "@ui/components/Drawer"
import { useAppState } from "@ui/state/app"
import { type FC, useState } from "react"
import { useTranslation } from "react-i18next"

type BittensorConvictionLockWhyDrawerProps = {
  isOpen: boolean
  containerId: string
  /** Closes the whole wizard. */
  onCancel: () => void
  /** Closes only the drawer, revealing the form. */
  onContinue: () => void
}

/**
 * Intro drawer shown when the conviction lock wizard opens: explains what locking does before the
 * user commits stake. Cancel backs out of the wizard entirely, Continue reveals the form.
 */
export const BittensorConvictionLockInfoDrawer: FC<BittensorConvictionLockWhyDrawerProps> = ({
  isOpen,
  containerId,
  onCancel,
  onContinue,
}) => {
  const { t } = useTranslation()

  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [, setHideConvictionLockInfo] = useAppState("hideBittensorConvictionLockInfo")

  const handleContinue = () => {
    // only persist the dismissal when the user proceeds; backing out leaves the flag untouched
    if (dontShowAgain) setHideConvictionLockInfo(true)
    onContinue()
  }

  return (
    <Drawer anchor="bottom" isOpen={isOpen} containerId={containerId}>
      <div className="flex w-full flex-col gap-8 rounded-t-xl bg-grey-850 p-12">
        <div className="flex items-center justify-center gap-4 font-bold text-body">
          {t("Understand conviction locks")}
        </div>
        <div className="flex flex-col gap-4 text-body-secondary text-sm leading-paragraph">
          <p>
            {t(
              "Conviction locking lets you publicly back a hotkey by committing staked subnet tokens. Your on-chain conviction score grows the longer it stays locked."
            )}
          </p>
          <p>
            {t(
              "Locked stake cannot be unstaked immediately. A decaying lock unlocks gradually, with roughly half unlocking every 90 days. A perpetual lock stays at full strength until you switch it to decaying."
            )}
          </p>
        </div>
        <Checkbox
          className="text-body-secondary text-sm"
          checked={dontShowAgain}
          onChange={(e) => setDontShowAgain(e.target.checked)}
        >
          {t("Don't show this again")}
        </Checkbox>
        <div className="grid w-full grid-cols-2 gap-8">
          <Button onClick={onCancel}>{t("Cancel")}</Button>
          <Button primary onClick={handleContinue}>
            {t("Continue")}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
