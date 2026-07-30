import { Button } from "@ui/components/Button"
import { PillButton } from "@ui/components/PillButton"
import { Toggle } from "@ui/components/Toggle"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { BondAccountPillButton } from "@ui/domains/Staking/Bond/BondAccountPillButton"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { sortBittensorNetworkIds, useBittensorNetworkIds } from "@ui/state/bittensor"
import { useNetworkById } from "@ui/state/chaindata"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { SapiSendButton } from "../../../../Transactions/SapiSendButton"
import { BondAccountPicker } from "../../../Bond/BondAccountPicker"
import { StakingFeeEstimate } from "../../../shared/StakingFeeEstimate"
import { BittensorStakingModalHeader } from "../../components/BittensorModalHeader"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import { BittensorNetworkPicker } from "../../components/BittensorNetworkPicker"
import {
  BittensorRewardTypePicker,
  useRewardTypeLabel,
} from "../../components/BittensorRewardTypePicker"
import { BITTENSOR_SETTINGS_MODAL_CONTENT_CONTAINER_ID } from "../constants"
import { useBittensorSettingsModal } from "../hooks/useBittensorSettingsModal"
import { useBittensorSettingsWizard } from "../hooks/useBittensorSettingsWizard"

export const BittensorSettingsForm = () => {
  const { t } = useTranslation()
  const {
    networkId,
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
    setNetworkId,
    setSelectedClaimType,
    setSelectedSubnets,
    setSelectedAcceptLockedAlpha,
    onSubmitted,
  } = useBittensorSettingsWizard()
  const network = useNetworkById(networkId)
  const { close } = useBittensorSettingsModal()
  const rewardTypePicker = useOpenClose()
  const networkPicker = useOpenClose()
  const bittensorNetworkIds = useBittensorNetworkIds()

  const networkIds = useMemo(
    () => sortBittensorNetworkIds(bittensorNetworkIds),
    [bittensorNetworkIds]
  )
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
      contentClassName="text-body-secondary flex size-full flex-col gap-8 p-12 pt-0"
    >
      <div className="flex flex-col gap-4 rounded bg-grey-900 p-4 text-sm leading-paragraph">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="whitespace-nowrap">{t("Network")}</div>
          <div className="overflow-hidden">
            {networkIds.length > 1 ? (
              <PillButton className="h-16 max-w-full rounded px-4" onClick={networkPicker.open}>
                <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base text-body">
                  <NetworkLogo networkId={networkId} className="size-12 shrink-0" />
                  <div className="grow truncate leading-base">{network?.name ?? "Bittensor"}</div>
                </div>
              </PillButton>
            ) : (
              <div className="text-body">
                <NetworkLogo networkId={networkId} className="mr-2 inline-block size-12" />{" "}
                {network?.name ?? "Bittensor"}
              </div>
            )}
          </div>
        </div>
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="whitespace-nowrap">{t("Account")}</div>
          <div className="overflow-hidden">
            <BondAccountPillButton address={account?.address} onClick={accountPicker.open} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded bg-grey-900 p-6 text-body-secondary text-sm leading-paragraph">
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
        <div className="flex flex-col gap-2 rounded bg-grey-900 p-6 text-body-secondary text-sm leading-paragraph">
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

      <div className="flex flex-col gap-2 rounded bg-grey-900 p-6 text-body-secondary text-sm leading-paragraph">
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

      <div className="grid w-full grid-cols-2 gap-8">
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
        networkId={networkId}
        selectedSubnets={selectedSubnets}
        initialView={pickerInitialView}
        onSelect={setSelectedClaimType}
        onToggleSubnet={handleToggleSubnet}
        onDismiss={rewardTypePicker.close}
      />

      <BittensorNetworkPicker
        containerId={BITTENSOR_SETTINGS_MODAL_CONTENT_CONTAINER_ID}
        isOpen={networkPicker.isOpen}
        networkIds={networkIds}
        value={networkId}
        onSelect={setNetworkId}
        onDismiss={networkPicker.close}
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
