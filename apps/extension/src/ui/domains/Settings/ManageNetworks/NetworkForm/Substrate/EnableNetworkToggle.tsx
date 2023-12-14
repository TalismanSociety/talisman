import { RotateCcwIcon } from "@talismn/icons"
import { useKnownChain } from "@ui/hooks/useKnownChain"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { FormFieldContainer, Toggle, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

export const EnableNetworkToggle: FC<{ chainId?: string }> = ({ chainId }) => {
  const { t } = useTranslation("admin")
  const { chain, isActive, setActive, isActiveSetByUser, resetToTalismanDefault } =
    useKnownChain(chainId)

  if (!chain) return null

  return (
    <div className="pt-8">
      <FormFieldContainer label={t("Display balances")}>
        <div className="flex gap-3">
          <Toggle checked={isActive} onChange={(e) => setActive(e.target.checked)}>
            <span className={"text-grey-300"}>{isActive ? t("Yes") : t("No")}</span>
          </Toggle>
          {isActiveSetByUser && (
            <Tooltip>
              <TooltipTrigger
                className="text-primary text-xs"
                type="button"
                onClick={resetToTalismanDefault}
              >
                <RotateCcwIcon />
              </TooltipTrigger>
              <TooltipContent>
                <div>{t("Reset to default")}</div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </FormFieldContainer>
    </div>
  )
}
