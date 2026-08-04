import { SettingsIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { BondAccountPillButton } from "@ui/domains/Staking/Bond/BondAccountPillButton"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import { cn } from "@ui/util/cn"
import { shortenAddress } from "@ui/util/shortenAddress"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useCombinedBittensorValidatorsData } from "../../../hooks/bittensor/useCombinedBittensorValidatorsData"
import { BittensorStakingModalHeader } from "../../components/BittensorModalHeader"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import { useBittensorChangeValidatorWizard } from "../../hooks/useBittensorChangeValidatorWizard"

export const ChangeValidatorForm = () => {
  const { t } = useTranslation()
  const {
    token,
    account,
    nativeToken,
    currentHotkey,
    newHotkey,
    currentPosition,
    alphaAmount,
    feeToken,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    payload,
    rootStakeHoldMessage,
    close,
    setStep,
  } = useBittensorChangeValidatorWizard()

  // Can only proceed if a new validator is selected
  const canReview = !!payload && !!newHotkey && newHotkey !== currentHotkey

  if (!token || !currentPosition) {
    return (
      <BittensorModalLayout
        header={
          <BittensorStakingModalHeader
            title={t("Change Validator")}
            onCloseModal={close}
            withClose
          />
        }
      >
        <div className="flex size-full items-center justify-center p-12">
          <div className="text-center text-body-secondary">
            {t("No staking position found for this token")}
          </div>
        </div>
      </BittensorModalLayout>
    )
  }

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader title={t("Change Validator")} onCloseModal={close} withClose />
      }
      contentClassName="text-body-secondary flex size-full flex-col gap-4 p-12 pt-0"
    >
      {/* Asset and Account Summary */}
      <div className="flex flex-col gap-4 rounded bg-grey-900 p-4 text-sm leading-paragraph">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="whitespace-nowrap">{t("Asset")}</div>
          <div className="overflow-hidden">
            <div className="flex h-16 items-center gap-4 px-4">
              <TokenLogo tokenId={nativeToken?.id} className="shrink-0 text-lg" />
              <div className="text-base text-body">{nativeToken?.symbol}</div>
            </div>
          </div>
        </div>
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="whitespace-nowrap">{t("Account")}</div>
          <div className="overflow-hidden">
            <BondAccountPillButton
              address={account?.address}
              onClick={() => setStep("select-position")}
            />
          </div>
        </div>
      </div>

      {/* Staking Details */}
      <div className="flex flex-col gap-4 rounded bg-grey-900 p-4 text-xs leading-paragraph">
        <div className="flex items-center justify-between gap-8">
          <div className="whitespace-nowrap">{t("Staked Amount")}</div>
          <div className="overflow-hidden text-body">
            <TokensAndFiat
              isBalance
              tokenId={token.id}
              planck={alphaAmount ?? 0n}
              noCountUp
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-8">
          <div className="whitespace-nowrap">{t("Subnet")}</div>
          <div className="truncate text-body">
            {token.netuid === 0 ? t("Root Network") : `SN${token.netuid} ${token.subnetName ?? ""}`}
          </div>
        </div>
      </div>

      {/* Validator Selection */}
      <div className="flex flex-col gap-4 rounded bg-grey-900 p-4 text-xs leading-paragraph">
        <div className="flex items-center justify-between gap-6">
          <div className="whitespace-nowrap">{t("Current Validator")}</div>
          <div className="truncate text-body">
            <BittensorValidatorName hotkey={currentHotkey ?? undefined} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-6">
          <div className="shrink-0 whitespace-nowrap">{t("New Validator")}</div>
          <div className="min-w-0 overflow-hidden text-body">
            <ValidatorSelectButton
              hotkey={newHotkey ?? currentHotkey}
              netuid={token.netuid}
              onClick={() => setStep("select-validator")}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-8">
          <div className="whitespace-nowrap">{t("Estimated Fee")}</div>
          <div className="overflow-hidden">
            <StakingFeeEstimate
              plancks={feeEstimate ?? undefined}
              tokenId={feeToken?.id}
              isLoading={isLoadingFeeEstimate}
              error={errorFeeEstimate}
            />
          </div>
        </div>
      </div>

      <div className="grow" />

      {!!rootStakeHoldMessage && (
        <div className="text-center text-brand-orange text-xs">{rootStakeHoldMessage}</div>
      )}

      <Button
        primary
        fullWidth
        className="mt-6"
        disabled={!canReview}
        onClick={() => setStep("review")}
      >
        {t("Review")}
      </Button>
    </BittensorModalLayout>
  )
}

const ValidatorSelectButton: FC<{
  hotkey: string | null
  netuid: number
  onClick: () => void
}> = ({ hotkey, netuid, onClick }) => {
  const { t } = useTranslation()
  const { token } = useBittensorChangeValidatorWizard()
  const { combinedValidatorsData } = useCombinedBittensorValidatorsData(token?.networkId, netuid)

  const validator = useMemo(
    () => combinedValidatorsData.find((data) => data.hotkey === hotkey),
    [combinedValidatorsData, hotkey]
  )

  const label = useMemo(() => {
    const poolName = validator?.name || (hotkey ? shortenAddress(hotkey, 8, 8) : undefined)
    return poolName ?? t("Select Validator")
  }, [validator, hotkey, t])

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex max-w-full cursor-pointer items-center gap-2 rounded-xl bg-pill px-4 py-2 font-light text-xs hover:bg-grey-700"
      )}
    >
      <SettingsIcon className="shrink-0 text-body-secondary" />
      <div className="truncate">{label}</div>
    </button>
  )
}
