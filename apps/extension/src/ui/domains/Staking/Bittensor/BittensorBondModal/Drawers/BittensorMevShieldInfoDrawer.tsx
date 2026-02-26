import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

export const MevShieldInfoDrawer: FC<{
  isOpen: boolean
  containerId: string
  onDismiss: () => void
}> = ({ isOpen, onDismiss, containerId }) => {
  const { t } = useTranslation()
  return (
    <Drawer anchor="bottom" isOpen={isOpen} onDismiss={onDismiss} containerId={containerId}>
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
              "The validator's public key for the next block is embedded in the encrypted payload, so the transaction is only valid for that single block. This makes it too time-sensitive for hardware wallets, so MEV Shield is disabled when using one."
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
