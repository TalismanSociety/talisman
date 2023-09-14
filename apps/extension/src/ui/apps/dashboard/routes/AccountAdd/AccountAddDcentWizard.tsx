import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { AccountAddDcentWizard } from "@ui/domains/Account/AccountAdd/AccountAddDcent"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { useTranslation } from "react-i18next"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const AccountAddDcentDashboardWizard = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")
  const { t } = useTranslation("admin")

  return (
    <DashboardLayout withBack centered>
      <HeaderBlock
        title={t("Connect D'CENT Biometric Wallet")}
        text={t(
          "Before proceeding with the connection between Talisman Wallet and D'CENT Biometric Wallet, please carefully read and follow the instructions below to ensure a smooth and secure experience."
        )}
      />
      <AccountAddDcentWizard onSuccess={setAddress} />
    </DashboardLayout>
  )
}
