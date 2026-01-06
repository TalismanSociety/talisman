import { SettingsIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { BondAccountPillButton } from "@ui/domains/Staking/Bond/BondAccountPillButton"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"

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
          <div className="text-body-secondary text-center">
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
      <div className="bg-grey-900 leading-paragraph flex flex-col gap-4 rounded p-4 text-sm">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="whitespace-nowrap">{t("Asset")}</div>
          <div className="overflow-hidden">
            <div className="flex h-16 items-center gap-4 px-4">
              <TokenLogo tokenId={nativeToken?.id} className="shrink-0 text-lg" />
              <div className="text-body text-base">{nativeToken?.symbol}</div>
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
      <div className="bg-grey-900 leading-paragraph flex flex-col gap-4 rounded p-4 text-xs">
        <div className="flex items-center justify-between gap-8">
          <div className="whitespace-nowrap">{t("Staked Amount")}</div>
          <div className="text-body overflow-hidden">
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
          <div className="text-body truncate">
            {token.netuid === 0 ? t("Root Network") : `SN${token.netuid} ${token.subnetName ?? ""}`}
          </div>
        </div>
      </div>

      {/* Validator Selection */}
      <div className="bg-grey-900 leading-paragraph flex flex-col gap-4 rounded p-4 text-xs">
        <div className="flex items-center justify-between gap-6">
          <div className="whitespace-nowrap">{t("Current Validator")}</div>
          <div className="text-body truncate">
            <BittensorValidatorName hotkey={currentHotkey ?? undefined} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-6">
          <div className="shrink-0 whitespace-nowrap">{t("New Validator")}</div>
          <div className="text-body min-w-0 overflow-hidden">
            <ValidatorSelectButton
              hotkey={newHotkey}
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
  const { combinedValidatorsData } = useCombinedBittensorValidatorsData(netuid)

  const validator = useMemo(
    () => combinedValidatorsData.find((data) => data.hotkey === hotkey),
    [combinedValidatorsData, hotkey],
  )

  const label = useMemo(() => {
    const poolName = validator?.name || (hotkey ? shortenAddress(hotkey, 8, 8) : undefined)
    return poolName ?? t("Select Validator")
  }, [validator, hotkey, t])

  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "bg-pill hover:bg-grey-700 flex max-w-full cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-light",
      )}
    >
      <SettingsIcon className="text-body-secondary shrink-0" />
      <div className="truncate">{label}</div>
    </button>
  )
}
