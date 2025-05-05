import { useTranslation } from "react-i18next"

/** Not implemented - we will need this if we want to add support for lifi protocol */
export const SwapApproveErc20 = () => {
  const { t } = useTranslation()

  return <div>{t("Erc20 approvals are not implemented")}</div>
}
