import { WithTooltip } from "@talisman/components/Tooltip"
import { InfoIcon } from "@talismn/icons"
import { useTranslation } from "react-i18next"

export const LimitToNetworkTooltip = () => {
  const { t } = useTranslation("send-funds")

  return (
    <WithTooltip
      tooltip={
        <>
          <div>{t("Lock this address to one network.")}</div>
          <div>{t("Recommended for Exchange and Ledger addresses.")}</div>
          <div>{t("This prevents sending funds to this address on incompatible networks.")}</div>
        </>
      }
    >
      <InfoIcon />
    </WithTooltip>
  )
}
