import { Button } from "@ui/components/Button"
import { FormFieldInputText } from "@ui/components/FormFieldInputText"
import { PillButton } from "@ui/components/PillButton"
import { type FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  SWAP_LIFI_SLIPPAGE_DEFAULT,
  SWAP_LIFI_SLIPPAGE_SCHEMA,
  useSwapLifiSlippage,
} from "../hooks/useSwapLifiSlippage"

export const SwapLifiSlippageForm: FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation()
  const [slippagePercent, setSlippagePercent] = useSwapLifiSlippage()
  const [slippageEdit, setSlippageEdit] = useState<string>(slippagePercent.toFixed(2))

  const isValid = useMemo(() => {
    if (slippageEdit.trim() === "") return false
    return SWAP_LIFI_SLIPPAGE_SCHEMA.safeParse(Number(slippageEdit)).success
  }, [slippageEdit])

  return (
    <>
      <p className="text-body-secondary text-sm">
        {t("Choose how much price movement is allowed before a LI.FI swap is reverted for safety.")}
      </p>

      <div className="mt-4 flex items-center gap-2 self-start text-body-secondary text-sm">
        <div>{t("Slippage Tolerance")}</div>
      </div>

      <FormFieldInputText
        small
        containerProps={{ className: "bg-black px-6 text-right" }}
        after={
          <div className="flex items-center gap-4">
            <div>%</div>
            <PillButton
              className="h-[3rem] px-4"
              onClick={() => {
                setSlippagePercent(SWAP_LIFI_SLIPPAGE_DEFAULT)
                setSlippageEdit(SWAP_LIFI_SLIPPAGE_DEFAULT.toFixed(2))
              }}
            >
              {t("Reset")}
            </PillButton>
          </div>
        }
        placeholder={SWAP_LIFI_SLIPPAGE_DEFAULT.toFixed(2)}
        onChange={(e) => setSlippageEdit(e.target.value)}
        value={slippageEdit}
      />

      <div className="mt-8 flex w-full items-center">
        <Button
          className="w-full"
          primary
          disabled={!isValid}
          onClick={() => {
            setSlippagePercent(Number(slippageEdit))
            onClose()
          }}
        >
          {t("Save")}
        </Button>
      </div>
    </>
  )
}
