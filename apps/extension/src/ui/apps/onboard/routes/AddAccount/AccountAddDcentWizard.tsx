import { AccountAddDcentWizard } from "@ui/domains/Account/AccountAdd/AccountAddDcent"

import { AccountAddWrapper } from "./AccountAddWrapper"

export const AccountAddDcentOnboardingWizard = () => (
  <AccountAddWrapper
    className="min-h-[90rem] min-w-[68rem]"
    render={(onSuccess) => <AccountAddDcentWizard onSuccess={onSuccess} />}
  />
)
