import { AccountAddDerivedForm } from "@ui/domains/Account/AccountAdd/AccountAddDerived/AccountAddDerivedForm"
import { useTranslation } from "react-i18next"

import { AccountAddWrapper } from "./AccountAddWrapper"

export const AccountAddDerivedPage = () => {
  const { t } = useTranslation("admin")

  return (
    <AccountAddWrapper
      title={t("Create a new account")}
      className="min-h-[72rem] min-w-[68rem]"
      render={(onSuccess) => <AccountAddDerivedForm onSuccess={onSuccess} />}
    />
  )
}
