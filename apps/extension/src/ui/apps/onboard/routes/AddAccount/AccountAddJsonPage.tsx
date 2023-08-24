import { OnboardDialog } from "@ui/apps/onboard/components/OnboardDialog"
import { useOnboard } from "@ui/apps/onboard/context"
import { Layout } from "@ui/apps/onboard/layout"
import { AccountAddJson } from "@ui/domains/Account/AccountAdd/AccountAddJson"
import { useTranslation } from "react-i18next"

export const AccountAddJsonPage = () => {
  const { t } = useTranslation("onboard")
  const { setOnboarded } = useOnboard()

  return (
    <Layout withBack>
      <OnboardDialog className="w-[68rem]" title={t("Import JSON")}>
        <p className="text-body-secondary mb-8 text-base">
          {t("Please choose the .json file you exported from Polkadot.js or Talisman")}
        </p>
        <AccountAddJson onSuccess={setOnboarded} />
      </OnboardDialog>
    </Layout>
  )
}
