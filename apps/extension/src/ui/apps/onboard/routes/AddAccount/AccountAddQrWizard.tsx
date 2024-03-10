import { AccountAddQrWizard } from "@ui/domains/Account/AccountAdd/AccountAddQr"

import { AccountAddWrapper } from "./AccountAddWrapper"

export const AccountAddQrOnboardWizard = () => {
  return (
    <AccountAddWrapper
      className="min-h-[90rem] min-w-[68rem]"
      render={(onSuccess) => <AccountAddQrWizard onSuccess={onSuccess} />}
    />
  )
}
