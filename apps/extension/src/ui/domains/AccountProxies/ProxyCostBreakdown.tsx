import { Skeleton } from "@ui/components/Skeleton"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import type { ProxyTxPreview } from "./useProxyTxPreview"

type ProxyCostBreakdownProps = {
  preview: ProxyTxPreview
  /** Label for the deposit row — e.g. "Reserved deposit" or "Deposit unlocked" */
  depositLabel?: string
}

export const ProxyCostBreakdown: FC<ProxyCostBreakdownProps> = ({ preview, depositLabel }) => {
  const { t } = useTranslation()
  const {
    nativeToken,
    depositDelta,
    feeEstimate,
    isLoadingFee,
    feeError,
    isBalanceLoading,
    transferablePlanck,
  } = preview

  const resolvedDepositLabel = depositLabel ?? t("Reserved deposit")

  return (
    <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6 text-sm">
      <div className="flex items-center justify-between gap-8">
        <span className="text-body-secondary">{t("Available balance")}</span>
        <span className="text-body">
          {!nativeToken?.id ? (
            <span className="text-body-disabled">{t("N/A")}</span>
          ) : isBalanceLoading ? (
            <Skeleton>{`0 ${nativeToken.symbol}`}</Skeleton>
          ) : (
            <TokensAndFiat
              tokenId={nativeToken.id}
              planck={transferablePlanck ?? 0n}
              noCountUp
              className="text-body-secondary"
              tokensClassName="text-body"
            />
          )}
        </span>
      </div>
      <div className="flex items-center justify-between gap-8">
        <span className="text-body-secondary">{resolvedDepositLabel}</span>
        <span className="text-body">
          {depositDelta !== null && nativeToken?.id ? (
            <TokensAndFiat
              tokenId={nativeToken.id}
              planck={depositDelta < 0n ? -depositDelta : depositDelta}
              noCountUp
              className="text-body-secondary"
              tokensClassName="text-body"
            />
          ) : (
            <span className="animate-pulse text-body-disabled">…</span>
          )}
        </span>
      </div>
      <div className="flex items-center justify-between gap-8">
        <span className="text-body-secondary">{t("Network fee")}</span>
        <span className="text-body">
          <StakingFeeEstimate
            plancks={feeEstimate}
            tokenId={nativeToken?.id}
            isLoading={isLoadingFee}
            error={feeError}
            noCountUp
          />
        </span>
      </div>
    </div>
  )
}
