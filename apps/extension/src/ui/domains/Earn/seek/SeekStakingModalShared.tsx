import type { TokenId } from "@talismn/chaindata-provider"
import { AlertCircleIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { FormFieldSetRow } from "@ui/domains/Earn/shared/FormFieldSet"
import { formatAprPercent } from "@ui/domains/Earn/shared/formatAprPercent"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import type { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"
import { cn } from "@ui/util/cn"
import { formatDuration, intervalToDuration } from "date-fns"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

export const SEEK_STAKING_MODAL_CONTAINER_ID = "seek-staking-modal"

export const NetworkDisplay: FC<{ networkId: string }> = ({ networkId }) => (
  <div className="flex w-full items-center gap-2 overflow-hidden text-body">
    <NetworkLogo className="size-8" networkId={networkId} />
    <NetworkName className="truncate" networkId={networkId} />
  </div>
)

export const SeekExpectedRewards: FC<{ apr: number | null | undefined }> = ({ apr }) => {
  const { t } = useTranslation()

  if (apr == null) return t("N/A")

  return (
    <div className="text-primary">{t("{{percent}} APR", { percent: formatAprPercent(apr) })}</div>
  )
}

export const SeekUnstakingPeriod: FC<{ withdrawDelay: bigint | null }> = ({ withdrawDelay }) => {
  const { t } = useTranslation()
  const locale = useDateFnsLocale()

  if (withdrawDelay === null) return t("N/A")
  if (withdrawDelay <= 0n) return t("None")

  const duration = intervalToDuration({ start: 0, end: Number(withdrawDelay) * 1000 })
  return formatDuration(duration, { locale })
}

export const TransactionError: FC<{ error?: string; errorDetails?: string }> = ({
  error,
  errorDetails,
}) => {
  if (!error) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="text-center text-brand-orange text-xs">
          <AlertCircleIcon className="inline-block align-text-top text-sm" /> {error}
        </div>
      </TooltipTrigger>
      {!!errorDetails && <TooltipContent>{errorDetails}</TooltipContent>}
    </Tooltip>
  )
}

const FeePlaceholder: FC<{ isLoading?: boolean }> = ({ isLoading }) => {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        "rounded-xs text-body-secondary",
        isLoading && "animate-pulse bg-body-disabled text-body-disabled"
      )}
    >
      {isLoading ? t("Estimating") : "-"}
    </div>
  )
}

// transaction priority + network fee rows, shared by the form screen (variant "xs", in its own
// field set) and the stake confirm screen (variant "small", appended to the recap field set)
export const SeekNetworkFeeRows: FC<{
  ethTx: ReturnType<typeof useEthTransaction>
  feeTokenId?: TokenId
  variant: "small" | "xs"
}> = ({ ethTx, feeTokenId, variant }) => {
  const { t } = useTranslation()
  const { transaction, txDetails } = ethTx

  return (
    <>
      <FormFieldSetRow label={t("Transaction Priority")} variant={variant}>
        {transaction && txDetails && feeTokenId ? (
          <EthFeeSelect
            key={transaction.nonce?.toString() ?? "pending"} // reset internal state when tx changes
            tokenId={feeTokenId}
            drawerContainerId={SEEK_STAKING_MODAL_CONTAINER_ID}
            gasSettingsByPriority={ethTx.gasSettingsByPriority}
            priority={ethTx.priority}
            txDetails={txDetails}
            networkUsage={ethTx.networkUsage}
            tx={transaction}
            setCustomSettings={ethTx.setCustomSettings}
            onChange={ethTx.setPriority}
            className="h-8 rounded-xs text-body"
          />
        ) : (
          <FeePlaceholder isLoading={ethTx.isLoading} />
        )}
      </FormFieldSetRow>
      <FormFieldSetRow
        label={t("Network Fee")}
        variant={variant}
        valueClassName="text-body-secondary"
      >
        {txDetails && feeTokenId ? (
          <TokensAndFiat
            planck={txDetails.estimatedFee.toString()}
            tokenId={feeTokenId}
            tokensClassName="text-body"
          />
        ) : (
          <FeePlaceholder isLoading={ethTx.isLoading} />
        )}
      </FormFieldSetRow>
    </>
  )
}
