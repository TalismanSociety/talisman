import { log } from "@common/log"
import { AlertTriangleIcon, InfoIcon, SaveIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { Button } from "@ui/components/Button"
import { FormFieldInputText } from "@ui/components/FormFieldInputText"
import { PillButton } from "@ui/components/PillButton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  SUBNET_SLIPPAGE_SCHEMA,
  useBittensorSubnetSlippage,
} from "../hooks/useBittensorSubnetSlippage"
import {
  DEFAULT_USER_MAX_SLIPPAGE,
  HIGH_PRICE_IMPACT,
  VERY_HIGH_PRICE_IMPACT,
} from "../utils/constants"

export const BittensorSlippageForm: FC<{
  netuid: number | null
  onClose: () => void
  autoFocus?: boolean
  inputContainerClassName?: string
}> = ({ netuid, onClose, autoFocus, inputContainerClassName }) => {
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

  const refInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (autoFocus) {
      refInput.current?.focus()
    }
  }, [autoFocus])

  return (
    <>
      <p className="text-body-secondary text-sm">
        {t(
          "You can customize the slippage percentage to balance transaction success and price accuracy."
        )}
      </p>
      <p className="text-body-secondary text-sm">
        {t("This setting will apply to all your subnet staking transactions.")}
      </p>
      <div className="mt-4 flex items-center gap-2 self-start text-body-secondary text-sm">
        <div>{t("Max Slippage")}</div>
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
        ref={refInput}
        small
        containerProps={{ className: cn("px-6 text-right", inputContainerClassName) }}
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
        className={cn(
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
    </>
  )
}
