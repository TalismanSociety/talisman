import type { QuoteLeg } from "@core/domains/swaps/types"
import { type EthNetworkId, evmNativeTokenId, type TokenId } from "@talismn/chaindata-provider"
import { EditIcon, InfoIcon } from "@talismn/icons"
import { Skeleton } from "@ui/components/Skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { FeeTooltip } from "@ui/domains/Ethereum/FeeTooltip"
import { useFeePriorityOptionsUI } from "@ui/domains/Ethereum/GasSettings/common"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import type { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import {
  RiskAnalysisPillButton,
  useShowRiskAnalysisPillButton,
} from "@ui/domains/Sign/risk-analysis/RiskAnalysisPillButton"
import { useBalance } from "@ui/state/balances"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { type FC, type ReactNode, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"

import { useSentTxFee } from "../hooks/useSentTxFee"
import { formatSwapDuration, formatSwapExchangeRate } from "../swap-utils"
import { SwapTxRow } from "./SwapTxCard"

export type SwapTxProvider = { name: string; logo: string; note?: string; notice?: string }

type EthTransactionState = ReturnType<typeof useEthTransaction>

const Amount: FC<{ tokenId: TokenId; planck: bigint }> = ({ tokenId, planck }) => (
  <TokensAndFiat
    tokenId={tokenId}
    planck={planck}
    className="text-body-secondary"
    tokensClassName="text-body"
    fiatClassName="text-body-secondary"
    noCountUp
  />
)

const ExchangeRate: FC<{ leg: QuoteLeg }> = ({ leg }) => {
  const fromToken = useToken(leg.fromTokenId)
  const toToken = useToken(leg.toTokenId)
  const [reversed, setReversed] = useState(false)

  const rate = useMemo(() => {
    if (!fromToken || !toToken) return undefined
    return formatSwapExchangeRate({
      fromAmount: leg.inputAmount,
      fromDecimals: fromToken.decimals,
      fromSymbol: fromToken.symbol,
      toDecimals: toToken.decimals,
      toSymbol: toToken.symbol,
      outputAmountBN: leg.outputAmount,
      reversed,
    })
  }, [fromToken, leg.inputAmount, leg.outputAmount, reversed, toToken])

  if (rate === undefined) return null

  return (
    <button
      type="button"
      className="cursor-pointer text-body hover:text-body-secondary"
      onClick={() => setReversed((current) => !current)}
    >
      {rate}
    </button>
  )
}

const Notice: FC<{ children: ReactNode }> = ({ children }) => (
  <div
    role="note"
    className="flex w-full items-start gap-4 rounded-sm bg-black-tertiary px-6 py-4 text-body-secondary text-tiny"
  >
    <InfoIcon className="mt-px size-6 shrink-0" />
    <div>{children}</div>
  </div>
)

export const SwapLegDetails: FC<{
  leg: QuoteLeg
  received?: bigint
  provider?: SwapTxProvider
  children?: ReactNode
}> = ({ leg, received, provider, children }) => {
  const { t } = useTranslation()

  return (
    <>
      <SwapTxRow label={t("You swap")}>
        <Amount tokenId={leg.fromTokenId} planck={leg.inputAmount} />
      </SwapTxRow>
      <SwapTxRow label={received === undefined ? t("You receive") : t("You received")}>
        <Amount tokenId={leg.toTokenId} planck={received ?? leg.outputAmount} />
      </SwapTxRow>
      {provider ? (
        <SwapTxRow label={t("Provider")}>
          <img src={provider.logo || undefined} alt="" className="size-10 shrink-0 rounded-full" />
          <span className="truncate">{provider.name}</span>
        </SwapTxRow>
      ) : null}
      <SwapTxRow label={t("Duration")}>{formatSwapDuration(leg.timeInSec, t("Instant"))}</SwapTxRow>
      <SwapTxRow label={t("Exchange Rate")}>
        <ExchangeRate leg={leg} />
      </SwapTxRow>
      {children}
      {provider?.note ? <div className="text-body-secondary text-xs">{provider.note}</div> : null}
      {provider?.notice ? <Notice>{provider.notice}</Notice> : null}
    </>
  )
}

export const SwapApprovalDetails: FC<{
  tokenId: TokenId
  amount: bigint
  fee?: ReactNode
  note?: ReactNode
  children?: ReactNode
}> = ({ tokenId, amount, fee, note, children }) => {
  const { t } = useTranslation()

  return (
    <>
      {fee}
      <SwapTxRow label={t("Approve")}>
        <Amount tokenId={tokenId} planck={amount} />
      </SwapTxRow>
      {children}
      {note ? <Notice>{note}</Notice> : null}
    </>
  )
}

export const SwapSlippageRow: FC<{ percent: number; onEdit?: () => void }> = ({
  percent,
  onEdit,
}) => {
  const { t } = useTranslation()
  const value = (
    <span className={percent === 0 ? "text-alert-warn" : undefined}>{percent.toFixed(2)}%</span>
  )

  return (
    <SwapTxRow label={t("Slippage Tolerance")}>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="flex cursor-pointer items-center gap-2 rounded-xl pl-2 font-light"
        >
          <EditIcon />
          {value}
        </button>
      ) : (
        value
      )}
    </SwapTxRow>
  )
}

export const SwapTxFeeRows: FC<{
  address: string | null | undefined
  feeTokenId: TokenId | undefined
  feePlanck: bigint | null
  isLoading: boolean
  hasError: boolean
  ethTx?: EthTransactionState
  isPriorityLocked?: boolean
  containerId?: string
}> = ({
  address,
  feeTokenId,
  feePlanck,
  isLoading,
  hasError,
  ethTx,
  isPriorityLocked,
  containerId,
}) => {
  const { t } = useTranslation()
  const balance = useBalance(address ?? undefined, feeTokenId)

  return (
    <>
      {ethTx ? (
        <SwapTxRow label={t("Priority")}>
          {ethTx.transaction && ethTx.txDetails && feeTokenId && ethTx.priority ? (
            <EthFeeSelect
              className="h-10"
              disabled={isPriorityLocked}
              tx={ethTx.transaction}
              tokenId={feeTokenId}
              drawerContainerId={containerId}
              gasSettingsByPriority={ethTx.gasSettingsByPriority}
              priority={ethTx.priority}
              txDetails={ethTx.txDetails}
              networkUsage={ethTx.networkUsage}
              setCustomSettings={ethTx.setCustomSettings}
              onChange={ethTx.setPriority}
            />
          ) : hasError ? (
            <span className="text-body-secondary">-</span>
          ) : (
            <Skeleton className="inline-block h-10 w-40 rounded-[1em]" />
          )}
        </SwapTxRow>
      ) : null}
      <SwapTxRow
        label={
          <>
            {t("Estimated TX Fee")}
            {feeTokenId && (feePlanck || balance) ? (
              <Tooltip placement="top">
                <TooltipTrigger asChild>
                  <span className="ml-2">
                    <InfoIcon className="inline align-text-top" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <FeeTooltip
                    tokenId={feeTokenId}
                    estimatedFee={feePlanck ?? undefined}
                    maxFee={ethTx?.txDetails?.maxFee}
                    l1DataFee={ethTx?.txDetails?.estimatedL1DataFee}
                    balance={balance?.transferable.planck}
                  />
                </TooltipContent>
              </Tooltip>
            ) : null}
          </>
        }
      >
        {hasError ? (
          <span className="truncate text-alert-error">{t("Failed to estimate fee")}</span>
        ) : !isLoading && feePlanck && feeTokenId ? (
          <Amount tokenId={feeTokenId} planck={feePlanck} />
        ) : (
          <Skeleton>0.0000 TKN ($0.00)</Skeleton>
        )}
      </SwapTxRow>
    </>
  )
}

const SentEthTxFeeRows: FC<{ hash: Hex; networkId: EthNetworkId }> = ({ hash, networkId }) => {
  const { t } = useTranslation()
  const options = useFeePriorityOptionsUI()
  const { priority, estimatedFee, paidFee, isLoading } = useSentTxFee(hash, networkId)
  const planck = paidFee ?? estimatedFee

  return (
    <>
      {priority ? (
        <SwapTxRow label={t("Priority")}>
          <img src={options[priority].icon} alt="" className="w-10" />
          <span>{options[priority].label}</span>
        </SwapTxRow>
      ) : null}
      <SwapTxRow label={paidFee === undefined ? t("Estimated TX Fee") : t("TX Fee")}>
        {planck !== undefined ? (
          <Amount tokenId={evmNativeTokenId(networkId)} planck={planck} />
        ) : isLoading ? (
          <Skeleton>0.0000 TKN ($0.00)</Skeleton>
        ) : (
          <span className="text-body-secondary">-</span>
        )}
      </SwapTxRow>
    </>
  )
}

/** a sent transaction keeps the priority it was sent at and shows what it costs */
export const SwapTxSentFeeRows: FC<{ hash: Hex; networkId: string }> = ({ hash, networkId }) => {
  const network = useNetworkById(networkId)
  return network?.platform === "ethereum" ? (
    <SentEthTxFeeRows hash={hash} networkId={network.id} />
  ) : null
}

export const SwapRiskRow = () => {
  const { t } = useTranslation()
  const showRiskAnalysis = useShowRiskAnalysisPillButton()

  if (!showRiskAnalysis) return null

  return (
    <SwapTxRow label={t("Risk Assessment")}>
      <RiskAnalysisPillButton className="h-10" size="xs" />
    </SwapTxRow>
  )
}
