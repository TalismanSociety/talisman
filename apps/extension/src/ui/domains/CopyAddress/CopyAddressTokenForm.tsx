import { TokenId } from "@talismn/chaindata-provider"

import { TokenPicker } from "../Asset/TokenPicker"
import { CopyAddressLayout } from "./CopyAddressLayout"
import { useCopyAddressWizard } from "./useCopyAddressWizard"

export const CopyAddressTokenForm = () => {
  const { state, setTokenId } = useCopyAddressWizard()

  return (
    <CopyAddressLayout title="Select a token to receive">
      <TokenPicker
        account={state.address}
        allowUntransferable
        showEmptyBalances
        onSelect={setTokenId}
      />
    </CopyAddressLayout>
  )
}
