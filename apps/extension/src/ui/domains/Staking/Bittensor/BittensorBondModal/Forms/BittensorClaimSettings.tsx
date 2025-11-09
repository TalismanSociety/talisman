import { useCallback } from "react"
import { useTranslation } from "react-i18next"

import { BondAccountPicker } from "../../../Bond/BondAccountPicker"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BittensorStakingModalHeader } from "../BittensorModalHeader"
import { BittensorModalLayout } from "../BittensorModalLayout"
import { BittensorAssetAccountSummary } from "../components/BittensorAssetAccountSummary"

export const BittensorClaimSettings = () => {
  const { t } = useTranslation()
  const { nativeToken, account, accountPicker, setAddress } = useBittensorBondWizard()

  const handleSelectAccount = useCallback(
    (address: string) => {
      setAddress(address)
      accountPicker.close()
    },
    [accountPicker, setAddress],
  )

  return (
    <BittensorModalLayout
      header={<BittensorStakingModalHeader title={t("Claim Settings")} withClose />}
      contentClassName="text-body-secondary flex size-full flex-col gap-4 p-12 pt-0"
    >
      <BittensorAssetAccountSummary
        token={nativeToken}
        accountAddress={account?.address}
        onAccountClick={accountPicker.open}
        assetLabel={t("Asset")}
        accountLabel={t("Account")}
      />

      <BondAccountPicker
        isOpen={accountPicker.isOpen}
        account={account}
        token={nativeToken}
        onBackClick={accountPicker.close}
        onCloseClick={close}
        onAddressSelected={handleSelectAccount}
      />
    </BittensorModalLayout>
  )
}
