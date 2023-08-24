import { OnboardDialog } from "@ui/apps/onboard/components/OnboardDialog"
import { useOnboard } from "@ui/apps/onboard/context"
import { Layout } from "@ui/apps/onboard/layout"
import { AccountAddWatchedForm } from "@ui/domains/Account/AccountAdd/AccountAddWatchedForm"
import { useTranslation } from "react-i18next"

export const AccountAddWatchedPage = () => {
  const { t } = useTranslation("onboard")
  const { setOnboarded } = useOnboard()

  return (
    <Layout withBack>
      <OnboardDialog className="w-[68rem]" title={t("Choose account type")}>
        <p className="text-body-secondary mb-8 text-base">
          {t("What type of account would you like to add?")}
        </p>
        <AccountAddWatchedForm onSuccess={setOnboarded} />
      </OnboardDialog>
    </Layout>
  )
}
