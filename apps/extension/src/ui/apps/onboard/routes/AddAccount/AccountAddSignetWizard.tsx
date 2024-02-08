import { AccountAddSignetWizard } from "@ui/domains/Account/AccountAdd/AccountAddSignet"

import { AccountAddWrapper } from "./AccountAddWrapper"

export const AccountAddSignetOnboardingWizard = () => (
  <AccountAddWrapper render={(onSuccess) => <AccountAddSignetWizard onSuccess={onSuccess} />} />
)
