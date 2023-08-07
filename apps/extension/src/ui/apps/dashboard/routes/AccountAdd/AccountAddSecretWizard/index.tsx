import { AccountAddSecretWizard } from "@ui/domains/Account/AccountCreate/AccountAddSecretMnemonic/router"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"

import { AccountAddSecretLayout } from "./AccountAddSecretLayout"

export const AccountAddSecretDashboardWizard = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <AccountAddSecretLayout>
      <AccountAddSecretWizard onSuccess={setAddress} />
    </AccountAddSecretLayout>
  )
}
