import { OnboardDialog } from "@ui/apps/onboard/components/OnboardDialog"
import { useOnboard } from "@ui/apps/onboard/context"
import { Layout } from "@ui/apps/onboard/layout"
import { AccountAddSecretWizard } from "@ui/domains/Account/AccountAdd/AccountAddSecret/router"

export const AccountAddSecretOnboardWizard = () => {
  const { setOnboarded } = useOnboard()

  return (
    <Layout withBack>
      <OnboardDialog className="w-[68rem]">
        <AccountAddSecretWizard onSuccess={setOnboarded} />
      </OnboardDialog>
    </Layout>
  )
}
