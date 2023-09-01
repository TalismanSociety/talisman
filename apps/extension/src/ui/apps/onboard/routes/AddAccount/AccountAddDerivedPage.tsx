import { OnboardDialog } from "@ui/apps/onboard/components/OnboardDialog"
import { useOnboard } from "@ui/apps/onboard/context"
import { Layout } from "@ui/apps/onboard/layout"
import { AccountAddDerivedForm } from "@ui/domains/Account/AccountCreate/AccountAddDerived/AccountAddDerivedForm"
import { useTranslation } from "react-i18next"

export const AccountAddDerivedPage = () => {
  const { t } = useTranslation("onboard")
  const { setOnboarded } = useOnboard()

  return (
    <Layout withBack>
      <OnboardDialog className="w-[68rem]" title={t("Create a new account")}>
        <AccountAddDerivedForm onSuccess={setOnboarded} />
      </OnboardDialog>
    </Layout>
  )
}
