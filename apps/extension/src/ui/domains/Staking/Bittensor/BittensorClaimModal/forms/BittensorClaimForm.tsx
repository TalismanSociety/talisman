import { BalanceFormatter } from "@talismn/balances"
import { AlertCircleIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { StakingAccountDisplay } from "@ui/domains/Staking/shared/StakingAccountDisplay"
import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"
import { formatDuration, intervalToDuration } from "date-fns"
import { type FC, type PropsWithChildren, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SapiSendButton } from "../../../../Transactions/SapiSendButton"
import { StakingFeeEstimate } from "../../../shared/StakingFeeEstimate"
import { BittensorStakingModalHeader } from "../../components/BittensorModalHeader"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import { BITTENSOR_CLAIM_MODAL_CONTENT_CONTAINER_ID } from "../constants"
import { useBittensorClaimModal } from "../hooks/useBittensorClaimModal"
import { useBittensorClaimWizard } from "../hooks/useBittensorClaimWizard"

const ClaimAlert: FC<PropsWithChildren> = ({ children }) => (
  <div className="mb-8 flex items-start gap-4 rounded bg-alert-warn/10 px-8 py-6 text-alert-warn text-xs leading-paragraph">
    <AlertCircleIcon className="mt-0.5 shrink-0 text-sm" />
    <span>{children}</span>
  </div>
)

export const BittensorClaimForm = () => {
  const { t } = useTranslation()
  const {
    networkId,
    isTargetExplicit,
    backToPicker,
    account,
    hotkey,
    nativeToken,
    claimablePlancks,
    dustThreshold,
    isClaimUnavailable,
    isBelowDustThreshold,
    holdDurationMs,
    canSubmit,
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    isLoadingPayload,
    onSubmitted,
  } = useBittensorClaimWizard()
  const { close } = useBittensorClaimModal()
  const locale = useDateFnsLocale()

  const holdWarning = useMemo(() => {
    if (!holdDurationMs) return null
    const duration = formatDuration(intervalToDuration({ start: 0, end: holdDurationMs }), {
      locale,
    })
    return t("After this claim, your staked {{symbol}} will be locked for another {{duration}}", {
      symbol: nativeToken?.symbol ?? "TAO",
      duration,
    })
  }, [holdDurationMs, locale, nativeToken?.symbol, t])

  const claimError = useMemo(() => {
    if (isClaimUnavailable) return t("These rewards are no longer available to claim")
    if (!isBelowDustThreshold) return null
    return t("The network's minimum claim is currently {{amount}} {{symbol}}", {
      amount: new BalanceFormatter(dustThreshold, nativeToken?.decimals).tokens,
      symbol: nativeToken?.symbol,
    })
  }, [
    isClaimUnavailable,
    isBelowDustThreshold,
    dustThreshold,
    nativeToken?.decimals,
    nativeToken?.symbol,
    t,
  ])

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader
          title={t("Claim Rewards")}
          withClose
          onCloseModal={close}
          // the position was picked in the modal: allow going back to pick another one
          onBackClick={isTargetExplicit ? undefined : backToPicker}
        />
      }
      contentClassName="text-body-secondary flex size-full flex-col p-12 pt-0 gap-6"
    >
      <h2 className="text-center text-body">{t("You are claiming")}</h2>

      <div className="flex w-full flex-col rounded bg-grey-900 p-8 text-body-secondary">
        <div className="flex items-center justify-between gap-8 pb-2">
          <div className="whitespace-nowrap">{t("Amount")}</div>
          <div className="flex items-center gap-4 overflow-hidden">
            <TokenLogo tokenId={nativeToken?.id} className="shrink-0 text-lg" />
            <TokensAndFiat
              isBalance
              tokenId={nativeToken?.id}
              planck={claimablePlancks}
              noCountUp
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-8 pt-2">
          <div className="whitespace-nowrap">{t("Account")}</div>
          <div className="flex items-center gap-4 overflow-hidden">
            <StakingAccountDisplay address={account?.address} chainId={networkId} />
          </div>
        </div>
        <div className="py-8">
          <hr className="text-grey-800" />
        </div>
        <div className="flex items-center justify-between gap-8 pb-2 text-xs">
          <div className="whitespace-nowrap">{t("Validator")}</div>
          <div className="truncate text-body">
            {hotkey && <BittensorValidatorName hotkey={hotkey} />}
          </div>
        </div>
        <div className="flex items-center justify-between gap-8 pt-2 text-xs">
          <div className="whitespace-nowrap">{t("Estimated Fee")}</div>
          <div>
            <StakingFeeEstimate
              plancks={feeEstimate}
              tokenId={nativeToken?.id}
              isLoading={isLoadingFeeEstimate}
              error={errorFeeEstimate}
              noCountUp
            />
          </div>
        </div>
      </div>

      {[holdWarning, claimError].filter(Boolean).map((message) => (
        <ClaimAlert key={message}>{message}</ClaimAlert>
      ))}

      <div className="grow" />

      {canSubmit && payload ? (
        <SapiSendButton
          containerId={BITTENSOR_CLAIM_MODAL_CONTENT_CONTAINER_ID}
          label={t("Confirm")}
          payload={payload}
          onSubmitted={onSubmitted}
          txMetadata={txMetadata}
        />
      ) : (
        <Button primary fullWidth disabled processing={canSubmit && isLoadingPayload}>
          {t("Confirm")}
        </Button>
      )}
    </BittensorModalLayout>
  )
}
