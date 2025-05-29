import { AlertTriangleIcon, InfoIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Button,
  Drawer,
  FormFieldInputText,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"

import { MODAL_CONTENT_CONTAINER_ID } from "../../../shared/ModalContent"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { DEFAULT_USER_MAX_SLIPPAGE, HIGH_SLIPPAGE, VERY_HIGH_SLIPPAGE } from "../../utils/constants"

export const BittensorSlippageDrawer = () => {
  const { slippageDrawer, userMaxSlippage, setUserMaxSlippage } = useBittensorBondWizard()
  const [maxSlippage, setMaxSlippage] = useState<string>(String(userMaxSlippage))
  const { t } = useTranslation()

  const { isOpen, close } = slippageDrawer

  return (
    <Drawer anchor="bottom" isOpen={isOpen} containerId={MODAL_CONTENT_CONTAINER_ID}>
      <div className="bg-grey-800 flex w-full flex-col items-center gap-4 rounded-t-xl p-12">
        <div className="text-body font-bold">{t("Set Max Slippage")}</div>
        <div className="text-body-secondary text-xs">
          {t(
            "You can customize the slippage percentage to balance transaction success and price accuracy.",
          )}
        </div>
        <div className="text-body-secondary mt-10 flex items-center gap-2 self-start text-xs">
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
          containerProps={{ className: "px-6" }}
          after={
            <div className="flex items-center gap-2">
              <div>%</div>
              <Button
                className="h-[3rem] px-4"
                small
                onClick={() => setMaxSlippage(String(DEFAULT_USER_MAX_SLIPPAGE))}
              >
                {t("Auto")}
              </Button>
            </div>
          }
          placeholder={String(DEFAULT_USER_MAX_SLIPPAGE)}
          onChange={(e) => setMaxSlippage(e.target.value)}
          value={maxSlippage}
        />
        <div
          className={classNames(
            "mb-4 flex items-center gap-2 self-start text-xs text-orange-500",
            Number(maxSlippage) < HIGH_SLIPPAGE && "invisible",
            Number(maxSlippage) >= VERY_HIGH_SLIPPAGE && "text-red-500",
          )}
        >
          <AlertTriangleIcon />
          <div>
            {Number(maxSlippage) >= VERY_HIGH_SLIPPAGE
              ? t("Very high slippage")
              : t("High slippage")}
          </div>
        </div>
        <div className="flex w-full items-center">
          <Button
            className="w-full text-sm"
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
