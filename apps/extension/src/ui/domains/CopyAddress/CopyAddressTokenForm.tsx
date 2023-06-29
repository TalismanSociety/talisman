import { useTranslation } from "react-i18next"

import { TokenPicker } from "../Asset/TokenPicker"
import { CopyAddressLayout } from "./CopyAddressLayout"
import { useCopyAddressWizard } from "./useCopyAddressWizard"

export const CopyAddressTokenForm = () => {
  const { tokenId, address, setTokenId } = useCopyAddressWizard()
  const { t } = useTranslation()

  return (
    <CopyAddressLayout title={t("Select a token to receive")}>
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
