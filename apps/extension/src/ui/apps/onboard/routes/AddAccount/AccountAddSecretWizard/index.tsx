import { useOnboard } from "@ui/apps/onboard/context"
import { AccountAddSecretWizard } from "@ui/domains/Account/AccountCreate/AccountAddSecret/router"

import { AccountAddSecretLayout } from "./AccountAddSecretLayout"

export const AccountAddSecretOnboardWizard = () => {
  const { setOnboarded } = useOnboard()

  return (
    <AccountAddSecretLayout>
      <AccountAddSecretWizard onSuccess={setOnboarded} />
    </AccountAddSecretLayout>
  )
}