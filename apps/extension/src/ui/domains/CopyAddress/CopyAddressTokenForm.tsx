import { TokenPicker } from "../Asset/TokenPicker"
import { CopyAddressLayout } from "./CopyAddressLayout"
import { useCopyAddressWizard } from "./useCopyAddressWizard"

export const CopyAddressTokenForm = () => {
  const { tokenId, address, setTokenId } = useCopyAddressWizard()

  return (
    <CopyAddressLayout title="Select a token to receive">
      <TokenPicker
        address={address}
        allowUntransferable
        showEmptyBalances
        onSelect={setTokenId}
        selected={tokenId}
      />
    </CopyAddressLayout>
  )
}
