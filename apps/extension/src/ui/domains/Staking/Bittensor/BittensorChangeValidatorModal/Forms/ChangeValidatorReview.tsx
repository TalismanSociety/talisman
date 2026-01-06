import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"

import { TokenLogo } from "../../../../Asset/TokenLogo"
import { TokensAndFiat } from "../../../../Asset/TokensAndFiat"
import { SapiSendButton } from "../../../../Transactions/SapiSendButton"
import { StakingAccountDisplay } from "../../../shared/StakingAccountDisplay"
import { StakingFeeEstimate } from "../../../shared/StakingFeeEstimate"
import { BittensorStakingModalHeader } from "../../components/BittensorModalHeader"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import { useBittensorChangeValidatorWizard } from "../../hooks/useBittensorChangeValidatorWizard"

export const ChangeValidatorReview = () => {
  const { t } = useTranslation()
  const {
    token,
    account,
    nativeToken,
    newHotkey,
    currentPosition,
    alphaAmount,
    payload,
    txMetadata,
    feeToken,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    onSubmitted,
    setStep,
    close,
  } = useBittensorChangeValidatorWizard()

  const [isDisabled, setIsDisabled] = useState(true)

  useEffect(() => {
    // Enable confirm button 0.5 second after the screen is open
    // to ensure the user doesn't accidentally click it (e.g., double click from prev screen)
    setTimeout(() => {
      setIsDisabled(false)
    }, 500)
  }, [])

  if (!account || !token || !currentPosition) return null

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader
          onCloseModal={close}
          title={t("Confirm Change Validator")}
          onBackClick={() => setStep("form")}
          withClose
        />
      }
      contentClassName="p-12 pt-0 flex flex-col w-full"
    >
      <div className="bg-grey-900 text-body-secondary flex w-full flex-col rounded p-8">
        <div className="flex items-center justify-between gap-8 pb-2">
          <div className="whitespace-nowrap">{t("Amount to Move")}</div>
          <div className="flex items-center gap-4 overflow-hidden">
            <TokenLogo tokenId={token.id} className="shrink-0 text-lg" />
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
        <div className="flex items-center justify-between gap-8 pt-2">
          <div className="whitespace-nowrap">{t("Account")}</div>
          <div className="flex items-center gap-4 overflow-hidden">
            <StakingAccountDisplay address={account.address} chainId={nativeToken?.networkId} />
          </div>
        </div>
        <div className="py-8">
          <hr className="text-grey-800" />
        </div>
        <div className="flex items-center justify-between gap-8 pb-2 text-xs">
          <div className="whitespace-nowrap">{t("Subnet")}</div>
          <div className="text-body truncate">
            {token.netuid === 0 ? t("Root Network") : `SN${token.netuid} ${token.subnetName ?? ""}`}
          </div>
        </div>
        <div className="flex items-center justify-between gap-8 py-2 text-xs">
          <div className="whitespace-nowrap">{t("From Validator")}</div>
          <div className="text-body truncate">
            <BittensorValidatorName hotkey={token.hotkey} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-8 py-2 text-xs">
          <div className="whitespace-nowrap">{t("To Validator")}</div>
          <div className="text-body truncate">
            <BittensorValidatorName hotkey={newHotkey ?? undefined} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-8 pt-2 text-xs">
          <div className="whitespace-nowrap">{t("Estimated Fee")}</div>
          <div>
            <StakingFeeEstimate
              plancks={feeEstimate ?? undefined}
              tokenId={feeToken?.id}
              isLoading={isLoadingFeeEstimate}
              error={errorFeeEstimate}
              noCountUp
            />
          </div>
        </div>
      </div>
      <div className="grow"></div>
      {payload && (
        <SapiSendButton
          containerId="StakingModalDialog"
          label={t("Change Validator")}
          payload={payload}
          onSubmitted={onSubmitted}
          txMetadata={txMetadata}
          disabled={isDisabled}
        />
      )}
    </BittensorModalLayout>
  )
}
