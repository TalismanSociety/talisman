import { classNames } from "@talismn/util"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import type { RootClaimType } from "../../hooks/bittensor/dTao/types"
import { SapiSendButton } from "../../../Transactions/SapiSendButton"
import { BondAccountPicker } from "../../Bond/BondAccountPicker"
import { DEFAULT_ROOT_CLAIM_TYPE } from "../../hooks/bittensor/dTao/types"
import { useGetBittensorClaimType } from "../../hooks/bittensor/dTao/useGetBittensorClaimType"
import { useGetBittensorClaimTypePayload } from "../../hooks/bittensor/dTao/useGetBittensorClaimTypePayload"
import { BittensorAssetAccountSummary } from "../components/BittensorAssetAccountSummary"
import { BittensorStakingModalHeader } from "../components/BittensorModalHeader"
import { BittensorModalLayout } from "../components/BittensorModalLayout"
import { useBittensorBondModal } from "../hooks/useBittensorBondModal"
import { useBittensorBondWizard } from "../hooks/useBittensorBondWizard"

export const BittensorClaimSettings = () => {
  const [selectedClaimType, setSelectedClaimType] = useState<RootClaimType>(DEFAULT_ROOT_CLAIM_TYPE)
  const { t } = useTranslation()
  const { nativeToken, account, accountPicker, setAddress, onSubmitted } = useBittensorBondWizard()
  const { close } = useBittensorBondModal()

  const { data: claimType, isLoading: isClaimTypeLoading } = useGetBittensorClaimType({
    networkId: nativeToken?.networkId,
    address: account?.address,
  })

  const { data: setClaimTypePayload, isLoading: isPayloadLoading } =
    useGetBittensorClaimTypePayload({
      networkId: nativeToken?.networkId,
      address: account?.address,
      claimType: selectedClaimType,
    })

  useEffect(() => {
    if (claimType) setSelectedClaimType(claimType)
  }, [claimType])

  const claimTypeOptions = useMemo(
    () => [
      {
        value: "Swap" as RootClaimType,
        title: t("Receive Rewards in Tao"),
        description: t("Rewards will be received in TAO and re-staked."),
      },
      {
        value: "Keep" as RootClaimType,
        title: t("Receive Rewards in Alpha"),
        description: t("Your rewards will be proportionally spread across Subnets."),
      },
    ],
    [t],
  )

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
        assetLabel={t("Network")}
        accountLabel={t("Account")}
      />

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-body text-sm font-semibold leading-[1.1]">{t("Reward Type")}</span>
          <span className="text-body-secondary text-xs leading-[1.4]">
            {t("Choose how to receive Root emission rewards for this account.")}
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-6" role="radiogroup" aria-label={t("Reward Type")}>
          {claimTypeOptions.map((option) => {
            const isSelected = selectedClaimType === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedClaimType(option.value)}
                disabled={isClaimTypeLoading}
                className={classNames(
                  "border-light-gray relative w-full rounded-sm border px-6 py-5 text-left transition-colors",
                  "bg-black-tertiary text-sm",
                  isSelected
                    ? "text-body"
                    : "text-body-secondary hover:border-grey-700 hover:text-body border-transparent",
                )}
              >
                <div className="flex flex-col gap-1 pr-10">
                  <span className="text-body text-[14px] font-semibold leading-[1.2]">
                    {option.title}
                  </span>
                  <span className="text-body-secondary text-[12px] leading-[1.4]">
                    {option.description}
                  </span>
                </div>
                <span
                  className={
                    "bg-grey-700 absolute right-6 top-5 flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                  }
                >
                  <span
                    className={classNames(
                      "h-3.5 w-3.5 rounded-full transition-colors",
                      isSelected ? "bg-primary" : "bg-transparent",
                    )}
                  />
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className={"mt-auto grid w-full grid-cols-2 gap-8"}>
        <Button onClick={close}>{t("Cancel")}</Button>

        {isPayloadLoading || !setClaimTypePayload?.payload || isClaimTypeLoading ? (
          <Button className="px-2" primary disabled>
            {t("Confirm")}
          </Button>
        ) : (
          <SapiSendButton
            containerId="StakingModalDialog"
            label={t("Confirm")}
            payload={setClaimTypePayload?.payload}
            onSubmitted={onSubmitted}
            txMetadata={setClaimTypePayload?.txMetadata}
            disabled={claimType === selectedClaimType}
          />
        )}
      </div>

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
