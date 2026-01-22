import { AlertTriangleIcon, InfoIcon, SaveIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { log } from "extension-shared"
import { type FC, useCallback, useMemo, useState } from "react"
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

import {
  SUBNET_SLIPPAGE_SCHEMA,
  useBittensorSubnetSlippage,
} from "../../hooks/useBittensorSubnetSlippage"
import {
  DEFAULT_USER_MAX_SLIPPAGE,
  HIGH_PRICE_IMPACT,
  VERY_HIGH_PRICE_IMPACT,
} from "../../utils/constants"

export const BittensorSlippageDrawer: FC<{
  isOpen: boolean
  onClose: () => void
  containerId: string
  netuid: number | null
}> = ({ containerId, isOpen, netuid, onClose }) => {
  return (
    <Drawer anchor="bottom" isOpen={isOpen} onDismiss={onClose} containerId={containerId}>
      <Content netuid={netuid} onClose={onClose} />
    </Drawer>
  )
}

export const Content: FC<{ netuid: number | null; onClose: () => void }> = ({
  netuid,
  onClose,
}) => {
  const [slippage, setSlippage] = useBittensorSubnetSlippage(netuid)
  const [slippageEdit, setSlippageEdit] = useState<string>(String(slippage))
  const { t } = useTranslation()

  const handleSubmit = useCallback(() => {
    try {
      setSlippage(Number(slippageEdit))
      onClose()
    } catch (err) {
      log.error("Invalid slippage input:", err)
    }
  }, [onClose, setSlippage, slippageEdit])

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
    <div className="flex w-full flex-col items-center gap-4 rounded-t-xl bg-black-secondary p-12">
      <div className="pb-8 font-bold text-body">{t("Slippage Tolerance")}</div>
      <p className="text-body-secondary text-sm">
        {t(
          "You can customize the slippage percentage to balance transaction success and price accuracy."
        )}
      </p>
      <p className="text-body-secondary text-sm">
        {t("This setting will apply to all your subnet staking transactions.")}
      </p>
      <div className="mt-4 flex items-center gap-2 self-start text-body-secondary text-sm">
        <div className="">{t("Max Slippage")}</div>
        <Tooltip>
          <TooltipTrigger>
            <InfoIcon />
          </TooltipTrigger>
          <TooltipContent>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {t(
                "Stake transaction will revert if the price changes more than the allowed slippage percentage."
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
          "mb-4 flex w-full items-center justify-end gap-2 text-orange-500 text-xs",
          Number(slippageEdit) < HIGH_PRICE_IMPACT && "invisible",
          Number(slippageEdit) >= VERY_HIGH_PRICE_IMPACT && "text-red-500"
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
  )
}
