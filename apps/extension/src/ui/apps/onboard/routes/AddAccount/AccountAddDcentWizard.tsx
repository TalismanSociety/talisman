import { AccountAddDcentWizard } from "@ui/domains/Account/AccountAdd/AccountAddDcent"

import { AccountAddWrapper } from "./AccountAddWrapper"

export const AccountAddDcentOnboardingWizard = () => (
  <AccountAddWrapper render={(onSuccess) => <AccountAddDcentWizard onSuccess={onSuccess} />} />
)
