import { useTranslation } from "react-i18next"

import { AccountPicker } from "../Account/AccountPicker"
import { CopyAddressLayout } from "./CopyAddressLayout"
import { useCopyAddressWizard } from "./useCopyAddressWizard"

export const CopyAddressAccountForm = () => {
  const { address, setAddress } = useCopyAddressWizard()
  const { t } = useTranslation()

  return (
    <CopyAddressLayout title={t("Select account")}>
      <AccountPicker selected={address} onSelect={setAddress} allowZeroBalance />
    </CopyAddressLayout>
  )
}
