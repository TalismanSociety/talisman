import { AccountAddSignetWizard } from "@ui/domains/Account/AccountAdd/AccountAddSignet"

import { AccountAddWrapper } from "./AccountAddWrapper"

export const AccountAddSignetOnboardingWizard = () => (
  <AccountAddWrapper
    className="min-h-[90rem] min-w-[68rem]"
    render={(onSuccess) => <AccountAddSignetWizard onSuccess={onSuccess} />}
  />
)
