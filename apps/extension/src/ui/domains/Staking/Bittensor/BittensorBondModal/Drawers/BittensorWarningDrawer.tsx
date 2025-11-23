import { FC, PropsWithChildren, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, Checkbox, Drawer } from "talisman-ui"

import { STAKING_MODAL_CONTENT_CONTAINER_ID } from "@ui/domains/Staking/shared/ModalContent"
import { useAppState } from "@ui/state"

import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"

type BittensorWarningDrawerProps = {
  setHasAckWarning: React.Dispatch<React.SetStateAction<boolean>>
}

export const BittensorWarningDrawer = ({ setHasAckWarning }: BittensorWarningDrawerProps) => {
  const [dontShowThisAgain, setDontShowThisAgain] = useState<boolean>(false)
  const [_, setHideWarning] = useAppState("hideBittensorSubnetStakeWarning")

  const { warningDrawer } = useBittensorBondWizard()
  const { isOpen, close } = warningDrawer
  const { t } = useTranslation()

  return (
    <Drawer anchor="bottom" isOpen={isOpen} containerId={STAKING_MODAL_CONTENT_CONTAINER_ID}>
      <div className="bg-grey-850 flex w-full flex-col items-center gap-8 rounded-t-xl p-12">
        <div className="text-body font-bold">{t("Subnet staking warning")}</div>
        <p className="text-body-secondary text-sm">
          <Trans
            t={t}
            defaults="DTao subnet staking has variable rewards and alpha tokens have price risk. <Link>Learn more</Link>"
            components={{
              Link: <LearnMoreButton />,
            }}
          />
        </p>
        <div className="text-body-secondary w-full text-sm">
          <Checkbox onChange={(e) => setDontShowThisAgain(e.target.checked)}>
            {t("Don't show this again")}
          </Checkbox>
        </div>
        <div className="grid w-full grid-cols-2 gap-8">
          <Button onClick={close}>{t("Close")}</Button>
          <Button
            primary
            onClick={() => {
              setHasAckWarning(true)
              setHideWarning(dontShowThisAgain)
              close()
            }}
          >
            {t("I Understand")}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

const DTAO_DOCS_URL =
  "https://medium.com/we-are-talisman/understanding-the-new-bittensor-dtao-subnet-staking-model-56f37a414151"

const LearnMoreButton: FC<PropsWithChildren> = ({ children }) => (
  <button
    type="button"
    className="inline text-white underline"
    onClick={() => window.open(DTAO_DOCS_URL, "_blank", "noopener noreferrer")}
  >
    {children}
  </button>
)
