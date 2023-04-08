import { AccountPicker } from "../Account/AccountPicker"
import { CopyAddressLayout } from "./CopyAddressLayout"
import { useCopyAddressWizard } from "./useCopyAddressWizard"

export const CopyAddressAccountForm = () => {
  const { type, tokenId, address, setAddress } = useCopyAddressWizard()

  return (
    <CopyAddressLayout title="Select account to receive">
      <AccountPicker
        tokenId={type === "token" ? tokenId : undefined}
        selected={address}
        onSelect={setAddress}
        allowZeroBalance
      />
    </CopyAddressLayout>
  )
}
