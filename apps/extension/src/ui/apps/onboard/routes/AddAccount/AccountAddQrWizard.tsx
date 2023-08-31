import { AccountAddQrWizard } from "@ui/domains/Account/AccountAdd/AccountAddQr"

import { AccountAddWrapper } from "./AccountAddWrapper"

export const AccountAddQrOnboardWizard = () => {
  return <AccountAddWrapper render={(onSuccess) => <AccountAddQrWizard onSuccess={onSuccess} />} />
}
