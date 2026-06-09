import { Button } from "@ui/components/Button"
import { Checkbox } from "@ui/components/Checkbox"
import { Drawer } from "@ui/components/Drawer"
import { useAppState } from "@ui/state/app"
import { type FC, useState } from "react"
import { useTranslation } from "react-i18next"

type BittensorConvictionLockWhyDrawerProps = {
  isOpen: boolean
  containerId: string
  symbol: string
  /** Closes the whole wizard. */
  onCancel: () => void
  /** Closes only the drawer, revealing the form. */
  onContinue: () => void
}

/**
 * Intro drawer shown when the conviction lock wizard opens: explains what locking does before the
 * user commits stake. Cancel backs out of the wizard entirely, Continue reveals the form.
 */
export const BittensorConvictionLockWhyDrawer: FC<BittensorConvictionLockWhyDrawerProps> = ({
  isOpen,
  containerId,
  symbol,
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
          {t("Why lock conviction?")}
        </div>
        <div className="flex flex-col gap-4 text-body-secondary text-sm leading-paragraph">
          <p>
            {t(
              "Locking is how you publicly back a hotkey for the long term. You commit part of your staked {{symbol}} to it, building an on-chain conviction score that grows the longer your stake stays locked.",
              { symbol }
            )}
          </p>
          <p>
            {t(
              "The score means something because the {{symbol}} is genuinely committed. You can't unstake it until it slowly unwinds, around half every 90 days. To hold your conviction at full strength, a perpetual lock keeps it in place for as long as you want.",
              { symbol }
            )}
          </p>
          <p>
            {t("Your locked {{symbol}} keeps earning normal staking rewards the whole time.", {
              symbol,
            })}
          </p>
          <p>
            {t(
              "Conviction is purely a public signal of commitment. It doesn't add extra rewards or voting power."
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
