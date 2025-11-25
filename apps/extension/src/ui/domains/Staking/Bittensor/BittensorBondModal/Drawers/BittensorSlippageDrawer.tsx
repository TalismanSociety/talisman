import { AlertTriangleIcon, InfoIcon, SaveIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { log } from "extension-shared"
import { useCallback, useMemo, useState } from "react"
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
  SUBNET_SLIPPAGE_SCHEMA,
  useBittensorSubnetSlippage,
} from "../../hooks/useBittensorSubnetSlippage"
import {
  DEFAULT_USER_MAX_SLIPPAGE,
  HIGH_PRICE_IMPACT,
  VERY_HIGH_PRICE_IMPACT,
} from "../../utils/constants"

export const BittensorSlippageDrawer = () => {
  const { slippageDrawer, netuid } = useBittensorBondWizard()
  const [slippage, setSlippage] = useBittensorSubnetSlippage(netuid)
  const [slippageEdit, setSlippageEdit] = useState<string>(String(slippage))
  const { t } = useTranslation()

  const { isOpen, close } = slippageDrawer

  const handleSubmit = useCallback(() => {
    try {
      setSlippage(Number(slippageEdit))
      close()
    } catch (err) {
      log.error("Invalid slippage input:", err)
    }
  }, [close, setSlippage, slippageEdit])

  const handleReset = useCallback(() => {
    setSlippage(DEFAULT_USER_MAX_SLIPPAGE)
    setSlippageEdit(String(DEFAULT_USER_MAX_SLIPPAGE))
  }, [setSlippage])

  const isValid = useMemo(() => {
    if (slippageEdit === "") return false
    const parsed = SUBNET_SLIPPAGE_SCHEMA.safeParse(Number(slippageEdit))
    return parsed.success
  }, [slippageEdit])

  return (
    <Drawer
      anchor="bottom"
      isOpen={isOpen}
      onDismiss={close}
      containerId={STAKING_MODAL_CONTENT_CONTAINER_ID}
    >
      <div className="bg-black-secondary flex w-full flex-col items-center gap-4 rounded-t-xl p-12">
        <div className="text-body pb-8 font-bold">{t("Slippage Tolerance")}</div>
        <p className="text-body-secondary text-sm">
          {t(
            "You can customize the slippage percentage to balance transaction success and price accuracy.",
          )}
        </p>
        <p className="text-body-secondary text-sm">
          {t("This setting will apply to all your subnet staking transactions.")}
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
          containerProps={{ className: "px-6 text-right bg-black" }}
          after={
            <div className="flex items-center gap-4">
              <div>%</div>
              <PillButton className="h-[3rem] px-4" onClick={handleReset}>
                {t("Reset")}
              </PillButton>
            </div>
          }
          placeholder={String(DEFAULT_USER_MAX_SLIPPAGE)}
          onChange={(e) => setSlippageEdit(e.target.value)}
          value={slippageEdit}
        />
        <div
          className={classNames(
            "mb-4 flex w-full items-center justify-end gap-2 text-xs text-orange-500",
            Number(slippageEdit) < HIGH_PRICE_IMPACT && "invisible",
            Number(slippageEdit) >= VERY_HIGH_PRICE_IMPACT && "text-red-500",
          )}
        >
          <AlertTriangleIcon />
          <div>
            {Number(slippageEdit) >= VERY_HIGH_PRICE_IMPACT
              ? t("Very high slippage")
              : t("High slippage")}
          </div>
        </div>
        <div className="flex w-full items-center">
          <Button
            className="w-full"
            icon={SaveIcon}
            primary
            disabled={!isValid}
            onClick={handleSubmit}
          >
            {t("Save")}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
