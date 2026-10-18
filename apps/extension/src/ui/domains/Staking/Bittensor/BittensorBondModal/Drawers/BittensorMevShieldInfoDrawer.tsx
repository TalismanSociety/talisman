import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

export const MevShieldInfoDrawer: FC<{
  isOpen: boolean
  containerId: string
  onDismiss: () => void
}> = ({ isOpen, onDismiss, containerId }) => {
  const { t } = useTranslation()
  return (
    <Drawer
      analyticsId="mev_shield_info"
      anchor="bottom"
      isOpen={isOpen}
      onDismiss={onDismiss}
      containerId={containerId}
    >
      <div className="flex w-full flex-col gap-8 overflow-hidden rounded-t bg-black-tertiary p-8 pt-12">
        <div className="text-center font-bold text-md">{t("MEV Shield")}</div>
        <p className="text-sm">
          {t(
            'MEV Shield protects your subnet staking transaction from frontrunning by wrapping it in an encrypted "shield" transaction.'
          )}
        </p>
        <ul className="list-outside list-disc space-y-2 pl-8 text-body-secondary text-sm">
          <li>
            {t(
              "You submit one encrypted wrapper transaction. If it succeeds, your staking transaction is automatically included in the next block."
            )}
          </li>
          <li>
            {t(
              "You still pay network fees for both the encrypted wrapper and the staking transaction."
            )}
          </li>
          <li>
            {t(
              "Even if the wrapper executes successfully, the staking transaction is not guaranteed to succeed (it can still fail on-chain)."
            )}
          </li>
          <li>
            {t(
              "The encrypted wrapper uses the public key of the validator that authors an upcoming block, so it is only valid for that block."
            )}
          </li>
          <li>
            {t(
              "With a Ledger you sign twice: first your transaction, then the encrypted wrapper. The second signature is time-sensitive: you have about 20 seconds to approve it. If you miss it, nothing is sent and you can approve it again without signing the first one again."
            )}
          </li>
          <li>
            {t(
              "Rootnet staking is not subject to MEV attacks in the same way, so MEV Shield is disabled for Rootnet staking."
            )}
          </li>
        </ul>

        <Button fullWidth onClick={onDismiss}>
          {t("Close")}
        </Button>
      </div>
    </Drawer>
  )
}
