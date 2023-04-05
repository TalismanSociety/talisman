import { AccountPicker } from "../Account/AccountPicker"
import { CopyAddressLayout } from "./CopyAddressLayout"
import { useCopyAddressWizard } from "./useCopyAddressWizard"

export const CopyAddressAccountForm = () => {
  const { state, setAddress } = useCopyAddressWizard()

  return (
    <CopyAddressLayout title="Select account to receive">
      <AccountPicker
        tokenId={state.type === "token" ? state.tokenId : undefined}
        selected={state.address}
        onSelect={setAddress}
      />
    </CopyAddressLayout>
  )
}
