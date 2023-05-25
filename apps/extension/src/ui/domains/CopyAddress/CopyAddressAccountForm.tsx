import { useTranslation } from "react-i18next"

import { AccountPicker } from "../Account/AccountPicker"
import { CopyAddressLayout } from "./CopyAddressLayout"
import { useCopyAddressWizard } from "./useCopyAddressWizard"

export const CopyAddressAccountForm = () => {
  const { mode, tokenId, address, setAddress } = useCopyAddressWizard()
  const { t } = useTranslation("copy-address")

  return (
    <CopyAddressLayout title={t("Select account")}>
      <AccountPicker
        tokenId={mode === "receive" ? tokenId : undefined}
        selected={address}
        onSelect={setAddress}
        allowZeroBalance
      />
    </CopyAddressLayout>
  )
}
