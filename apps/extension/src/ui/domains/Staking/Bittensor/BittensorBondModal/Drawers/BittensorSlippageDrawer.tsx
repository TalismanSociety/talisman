import { AlertTriangleIcon, InfoIcon, SaveIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Button,
  Drawer,
  FormFieldInputText,
  PillButton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"

import { STAKING_MODAL_CONTENT_CONTAINER_ID } from "../../../shared/ModalContent"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import {
  DEFAULT_USER_MAX_SLIPPAGE,
  HIGH_PRICE_IMPACT,
  VERY_HIGH_PRICE_IMPACT,
} from "../../utils/constants"

export const BittensorSlippageDrawer = () => {
  const { slippageDrawer, userMaxSlippage, setUserMaxSlippage } = useBittensorBondWizard()
  // const [slippageSetting, setSlippageSetting] = useSetting("dtaoSlippage")

  const [maxSlippage, setMaxSlippage] = useState<string>(String(userMaxSlippage))
  const { t } = useTranslation()

  const { isOpen, close } = slippageDrawer

  return (
    <Drawer
      anchor="bottom"
      isOpen={isOpen}
      onDismiss={close}
      containerId={STAKING_MODAL_CONTENT_CONTAINER_ID}
    >
      <div className="bg-grey-800 flex w-full flex-col items-center gap-4 rounded-t-xl p-12">
        <div className="text-body pb-8 font-bold">{t("Slippage Tolerance")}</div>
        <p className="text-body-secondary text-sm">
          {t(
            "You can customize the slippage percentage to balance transaction success and price accuracy.",
          )}
        </p>
        <div className="text-body-secondary mt-4 flex items-center gap-2 self-start text-sm">
          <div className="">{t("Max Slippage")}</div>
          <Tooltip>
            <TooltipTrigger>
              <InfoIcon />
            </TooltipTrigger>
            <TooltipContent>
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                {t(
                  "Stake transaction will revert if the price changes more than the allowed slippage percentage.",
                )}
              </span>
            </TooltipContent>
          </Tooltip>
        </div>
        <FormFieldInputText
          small
          containerProps={{ className: "px-6 text-right" }}
          after={
            <div className="flex items-center gap-4">
              <div>%</div>
              <PillButton
                className="h-[3rem] px-4"
                onClick={() => setMaxSlippage(String(DEFAULT_USER_MAX_SLIPPAGE))}
              >
                {t("Reset")}
              </PillButton>
            </div>
          }
          placeholder={String(DEFAULT_USER_MAX_SLIPPAGE)}
          onChange={(e) => setMaxSlippage(e.target.value)}
          value={maxSlippage}
        />
        <div
          className={classNames(
            "mb-4 flex items-center gap-2 self-start text-xs text-orange-500",
            Number(maxSlippage) < HIGH_PRICE_IMPACT && "invisible",
            Number(maxSlippage) >= VERY_HIGH_PRICE_IMPACT && "text-red-500",
          )}
        >
          <AlertTriangleIcon />
          <div>
            {Number(maxSlippage) >= VERY_HIGH_PRICE_IMPACT
              ? t("Very high slippage")
              : t("High slippage")}
          </div>
        </div>
        <div className="flex w-full items-center">
          <Button
            className="w-full"
            icon={SaveIcon}
            primary
            onClick={() => {
              close()
              setUserMaxSlippage(maxSlippage ? Number(maxSlippage) : DEFAULT_USER_MAX_SLIPPAGE)
              setMaxSlippage(maxSlippage ? maxSlippage : String(DEFAULT_USER_MAX_SLIPPAGE))
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
