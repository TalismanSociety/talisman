import { useKnownChain } from "@ui/hooks/useKnownChain"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { FormFieldContainer, Toggle } from "talisman-ui"

export const EnableNetworkToggle: FC<{ chainId?: string }> = ({ chainId }) => {
  const { t } = useTranslation("admin")
  const { chain, isEnabled, setEnabled } = useKnownChain(chainId)

  if (!chain) return null

  return (
    <div className="pt-8">
      <FormFieldContainer label={t("Display balances")}>
        <Toggle checked={isEnabled} onChange={(e) => setEnabled(e.target.checked)}>
          <span className={"text-grey-300"}>{isEnabled ? t("Yes") : t("No")}</span>
        </Toggle>
      </FormFieldContainer>
    </div>
  )
}
