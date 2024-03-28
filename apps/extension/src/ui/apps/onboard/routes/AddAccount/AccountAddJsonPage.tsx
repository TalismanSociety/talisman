import { AccountAddJson } from "@ui/domains/Account/AccountAdd/AccountAddJson"
import { useTranslation } from "react-i18next"

import { AccountAddWrapper } from "./AccountAddWrapper"

export const AccountAddJsonOnboardPage = () => {
  const { t } = useTranslation("admin")
  return (
    <AccountAddWrapper
      title={t("Import JSON")}
      subtitle={t("Please choose the .json file you exported from Polkadot.js or Talisman")}
      className="min-h-[85rem] min-w-[68rem]"
      render={(onSuccess) => <AccountAddJson onSuccess={onSuccess} />}
    />
  )
}
