import { Button } from "@ui/components/Button"
import { PillButton } from "@ui/components/PillButton"
import { Toggle } from "@ui/components/Toggle"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

import { SapiSendButton } from "../../../../Transactions/SapiSendButton"
import { BondAccountPicker } from "../../../Bond/BondAccountPicker"
import { StakingFeeEstimate } from "../../../shared/StakingFeeEstimate"
import { BittensorAssetAccountSummary } from "../../components/BittensorAssetAccountSummary"
import { BittensorStakingModalHeader } from "../../components/BittensorModalHeader"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import {
  BittensorRewardTypePicker,
  useRewardTypeLabel,
} from "../../components/BittensorRewardTypePicker"
import { BITTENSOR_NETWORK_ID, BITTENSOR_SETTINGS_MODAL_CONTENT_CONTAINER_ID } from "../constants"
import { useBittensorSettingsModal } from "../hooks/useBittensorSettingsModal"
import { useBittensorSettingsWizard } from "../hooks/useBittensorSettingsWizard"

export const BittensorSettingsForm = () => {
  const { t } = useTranslation()
  const {
    nativeToken,
    account,
    accountPicker,
    selectedClaimType,
    selectedSubnets,
    selectedAcceptLockedAlpha,
    isAcceptLockedAlphaLoading,
    acceptLockedAlphaUnsupported,
    isClaimTypeLoading,
    isClaimTypeError,
    refetchClaimType,
    canSubmit,
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    isLoadingPayload,
    setAddress,
    setSelectedClaimType,
    setSelectedSubnets,
    setSelectedAcceptLockedAlpha,
    onSubmitted,
  } = useBittensorSettingsWizard()
  const { close } = useBittensorSettingsModal()
  const rewardTypePicker = useOpenClose()
  const [pickerInitialView, setPickerInitialView] = useState<"type" | "subnets">("type")
  const rewardTypeLabel = useRewardTypeLabel(selectedClaimType)

  const handleSelectAccount = useCallback(
    (address: string) => {
      setAddress(address)
      accountPicker.close()
    },
    [accountPicker, setAddress]
  )

  const handleToggleSubnet = useCallback(
    (netuid: number) => {
      setSelectedSubnets(
        selectedSubnets.includes(netuid)
          ? selectedSubnets.filter((id) => id !== netuid)
          : [...selectedSubnets, netuid]
      )
    },
    [selectedSubnets, setSelectedSubnets]
  )

  const openRewardTypePicker = useCallback(() => {
    setPickerInitialView("type")
    rewardTypePicker.open()
  }, [rewardTypePicker])

  const openSubnetPicker = useCallback(() => {
    setPickerInitialView("subnets")
    rewardTypePicker.open()
  }, [rewardTypePicker])

  const isKeepSubnets = selectedClaimType === "KeepSubnets"
  // KeepSubnets needs at least one subnet selected before it can be submitted
  const keepSubnetsInvalid = isKeepSubnets && selectedSubnets.length === 0

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader
          title={t("Bittensor Settings")}
          withClose
          onCloseModal={close}
        />
      }
      contentClassName="text-body-secondary flex size-full flex-col gap-4 p-12 pt-0"
    >
      <BittensorAssetAccountSummary
        token={nativeToken}
        accountAddress={account?.address}
        onAccountClick={accountPicker.open}
        assetLabel={t("Network")}
        accountLabel={t("Account")}
      />

      <div className="mt-4 flex flex-col gap-2 rounded bg-grey-900 p-6 text-body-secondary text-sm leading-paragraph">
        <div className="flex min-h-12 items-center justify-between gap-8">
          <div>
            <div className="whitespace-nowrap text-body text-sm">{t("Root Staking Rewards")}</div>
            <div className="text-body-inactive text-xs">
              {t(
                "Select how you want to receive your staking rewards. This applies to Root Staking only."
              )}
            </div>
          </div>
        </div>

        <div className="flex min-h-12 items-center justify-between gap-8">
          <div className="whitespace-nowrap">{t("Receive rewards as")}</div>
          <PillButton
            className="h-12 max-w-full rounded-sm px-6!"
            disabled={isClaimTypeLoading || !selectedClaimType}
            onClick={openRewardTypePicker}
          >
            <div className="flex h-12 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-body">
              <div className="grow truncate leading-base">{rewardTypeLabel}</div>
            </div>
          </PillButton>
        </div>

        {isKeepSubnets && (
          <div className="flex min-h-12 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Subnets")}</div>
            <PillButton className="h-12 max-w-full rounded-sm px-6!" onClick={openSubnetPicker}>
              <div className="flex h-12 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-body">
                <div className="grow truncate leading-base">
                  {t("{{count}} selected", { count: selectedSubnets.length })}
                </div>
              </div>
            </PillButton>
          </div>
        )}
      </div>

      {!acceptLockedAlphaUnsupported && (
        <div className="mt-4 flex flex-col gap-2 rounded bg-grey-900 p-6 text-body-secondary text-sm leading-paragraph">
          <div className="flex min-h-12 items-center justify-between gap-8">
            <div>
              <div className="whitespace-nowrap text-body text-sm">{t("Conviction Locks")}</div>
              <div className="text-body-inactive text-xs">
                {t("Select if you accept incoming transfers with conviction locks.")}
              </div>
            </div>
          </div>

          <div className="flex min-h-12 items-center justify-between gap-8 py-1">
            <div className="text-body-secondary">{t("Accept transfers with conviction locks")}</div>
            <Toggle
              variant="sm"
              checked={!!selectedAcceptLockedAlpha}
              disabled={isAcceptLockedAlphaLoading || selectedAcceptLockedAlpha === null}
              onChange={(e) => setSelectedAcceptLockedAlpha(e.target.checked)}
            />
          </div>
        </div>
      )}
      <div className="grow" />

      {isClaimTypeError && (
        <div className="flex items-center gap-4 text-alert-warn text-sm">
          <div>{t("Unable to load claim settings from chain.")}</div>
          <button
            type="button"
            className="rounded-sm border bg-grey-800 px-3 py-1 text-body-secondary hover:text-body"
            onClick={() => refetchClaimType()}
          >
            {t("Retry")}
          </button>
        </div>
      )}

      <div className="my-4 flex flex-col gap-2 rounded bg-grey-900 p-6 text-body-secondary text-xs leading-paragraph">
        <div className="flex h-12 items-center justify-between gap-8">
          <div className="whitespace-nowrap">{t("Estimated fee")}</div>
          <div className="overflow-hidden">
            <StakingFeeEstimate
              plancks={feeEstimate}
              tokenId={nativeToken?.id}
              isLoading={isLoadingFeeEstimate}
              error={errorFeeEstimate}
            />
          </div>
        </div>
      </div>

      <div className={"mt-auto grid w-full grid-cols-2 gap-8"}>
        <Button onClick={close}>{t("Cancel")}</Button>

        {isLoadingPayload || !payload || isClaimTypeLoading ? (
          <Button className="px-2" primary disabled>
            {t("Confirm")}
          </Button>
        ) : (
          <SapiSendButton
            containerId={BITTENSOR_SETTINGS_MODAL_CONTENT_CONTAINER_ID}
            label={t("Confirm")}
            payload={payload}
            onSubmitted={onSubmitted}
            txMetadata={txMetadata}
            disabled={!canSubmit || keepSubnetsInvalid}
          />
        )}
      </div>

      <BittensorRewardTypePicker
        isOpen={rewardTypePicker.isOpen}
        containerId={BITTENSOR_SETTINGS_MODAL_CONTENT_CONTAINER_ID}
        value={selectedClaimType}
        networkId={BITTENSOR_NETWORK_ID}
        selectedSubnets={selectedSubnets}
        initialView={pickerInitialView}
        onSelect={setSelectedClaimType}
        onToggleSubnet={handleToggleSubnet}
        onDismiss={rewardTypePicker.close}
      />

      <BondAccountPicker
        containerId={BITTENSOR_SETTINGS_MODAL_CONTENT_CONTAINER_ID}
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
