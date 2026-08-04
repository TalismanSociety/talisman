import { BalanceFormatter } from "@talismn/balances"
import { Button } from "@ui/components/Button"
import { PillButton } from "@ui/components/PillButton"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { BondAccountPillButton } from "@ui/domains/Staking/Bond/BondAccountPillButton"
import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"
import { useNetworkById } from "@ui/state/chaindata"
import { formatDuration, intervalToDuration } from "date-fns"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SapiSendButton } from "../../../../Transactions/SapiSendButton"
import { StakingFeeEstimate } from "../../../shared/StakingFeeEstimate"
import { BittensorStakingModalHeader } from "../../components/BittensorModalHeader"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import { BittensorClaimPositionPicker } from "../components/BittensorClaimPositionPicker"
import { BITTENSOR_CLAIM_MODAL_CONTENT_CONTAINER_ID } from "../constants"
import { useBittensorClaimModal } from "../hooks/useBittensorClaimModal"
import { useBittensorClaimWizard } from "../hooks/useBittensorClaimWizard"

const BLOCK_TIME_MS = 12_000

export const BittensorClaimForm = () => {
  const { t } = useTranslation()
  const {
    networkId,
    account,
    nativeToken,
    selectedCandidate,
    positionPicker,
    claimablePlancks,
    dustThreshold,
    isBelowDustThreshold,
    isClaimingDisabled,
    holdIntervalBlocks,
    canSubmit,
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    isLoadingPayload,
    onSubmitted,
  } = useBittensorClaimWizard()
  const network = useNetworkById(networkId)
  const { close } = useBittensorClaimModal()
  const locale = useDateFnsLocale()

  const holdWarning = useMemo(() => {
    if (holdIntervalBlocks <= 0n) return null
    const duration = formatDuration(
      intervalToDuration({ start: 0, end: Number(holdIntervalBlocks) * BLOCK_TIME_MS }),
      { locale }
    )
    return t("Claiming locks your root stake for {{duration}}", { duration })
  }, [holdIntervalBlocks, locale, t])

  const dustError = useMemo(() => {
    // the chain dust-skips every claim while the threshold holds its launch sentinel value:
    // a submitted claim would succeed as a paid no-op (RootClaimed with 0 TAO)
    if (isClaimingDisabled) return t("Claiming rewards is not enabled by the network yet")
    if (!isBelowDustThreshold) return null
    return t("Minimum claim is {{amount}} {{symbol}}", {
      amount: new BalanceFormatter(dustThreshold, nativeToken?.decimals).tokens,
      symbol: nativeToken?.symbol,
    })
  }, [
    isClaimingDisabled,
    isBelowDustThreshold,
    dustThreshold,
    nativeToken?.decimals,
    nativeToken?.symbol,
    t,
  ])

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader title={t("Claim Rewards")} withClose onCloseModal={close} />
      }
      contentClassName="text-body-secondary flex size-full flex-col gap-8 p-12 pt-0"
    >
      <div className="flex flex-col gap-4 rounded bg-grey-900 p-4 text-sm leading-paragraph">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="whitespace-nowrap">{t("Network")}</div>
          <div className="overflow-hidden text-body">
            <NetworkLogo networkId={networkId} className="mr-2 inline-block size-12" />{" "}
            {network?.name ?? "Bittensor"}
          </div>
        </div>
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="whitespace-nowrap">{t("Account")}</div>
          <div className="overflow-hidden">
            <BondAccountPillButton address={account?.address} onClick={positionPicker.open} />
          </div>
        </div>
        <div className="flex h-16 items-center justify-between gap-6">
          <div className="whitespace-nowrap">{t("Validator")}</div>
          <div className="min-w-0 overflow-hidden">
            <PillButton className="h-16 max-w-full rounded px-4" onClick={positionPicker.open}>
              <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base text-body">
                {selectedCandidate ? (
                  <BittensorValidatorName hotkey={selectedCandidate.token.hotkey} />
                ) : (
                  t("Select validator")
                )}
              </div>
            </PillButton>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded bg-grey-900 p-4 text-sm leading-paragraph">
        <div className="flex h-16 items-center justify-between gap-8">
          <div className="whitespace-nowrap">{t("Claimable Rewards")}</div>
          <div className="overflow-hidden text-body">
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
      </div>

      <div className="text-body-inactive text-xs leading-paragraph">
        {t("Claimed rewards are staked on the Root Network, they are not paid out as free TAO.")}
      </div>

      <div className="grow" />

      {!!holdWarning && <div className="text-center text-brand-orange text-xs">{holdWarning}</div>}
      {!!dustError && <div className="text-center text-brand-orange text-xs">{dustError}</div>}

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
            containerId={BITTENSOR_CLAIM_MODAL_CONTENT_CONTAINER_ID}
            label={t("Confirm")}
            payload={payload}
            onSubmitted={onSubmitted}
            txMetadata={txMetadata}
            disabled={!canSubmit}
          />
        )}
      </div>

      <BittensorClaimPositionPicker
        containerId={BITTENSOR_CLAIM_MODAL_CONTENT_CONTAINER_ID}
        isOpen={positionPicker.isOpen}
        onDismiss={positionPicker.close}
      />
    </BittensorModalLayout>
  )
}
