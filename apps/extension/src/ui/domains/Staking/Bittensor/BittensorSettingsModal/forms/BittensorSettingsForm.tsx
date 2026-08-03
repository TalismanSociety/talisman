import { Button } from "@ui/components/Button"
import { PillButton } from "@ui/components/PillButton"
import { Toggle } from "@ui/components/Toggle"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { BondAccountPillButton } from "@ui/domains/Staking/Bond/BondAccountPillButton"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { sortBittensorNetworkIds, useBittensorNetworkIds } from "@ui/state/bittensor"
import { useNetworkById } from "@ui/state/chaindata"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { SapiSendButton } from "../../../../Transactions/SapiSendButton"
import { BondAccountPicker } from "../../../Bond/BondAccountPicker"
import { StakingFeeEstimate } from "../../../shared/StakingFeeEstimate"
import { BittensorStakingModalHeader } from "../../components/BittensorModalHeader"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import { BittensorNetworkPicker } from "../../components/BittensorNetworkPicker"
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
    selectedAcceptLockedAlpha,
    isAcceptLockedAlphaLoading,
    acceptLockedAlphaUnsupported,
    canSubmit,
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    isLoadingPayload,
    setAddress,
    setNetworkId,
    setSelectedAcceptLockedAlpha,
    onSubmitted,
  } = useBittensorSettingsWizard()
  const network = useNetworkById(networkId)
  const { close } = useBittensorSettingsModal()
  const networkPicker = useOpenClose()
  const bittensorNetworkIds = useBittensorNetworkIds()

  const networkIds = useMemo(
    () => sortBittensorNetworkIds(bittensorNetworkIds),
    [bittensorNetworkIds]
  )

  const handleSelectAccount = useCallback(
    (address: string) => {
      setAddress(address)
      accountPicker.close()
    },
    [accountPicker, setAddress]
  )

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

        {isLoadingPayload || !payload ? (
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
            disabled={!canSubmit}
          />
        )}
      </div>

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
