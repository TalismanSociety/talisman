import type { TokenId } from "@talismn/chaindata-provider"
import { EditIcon, InfoIcon } from "@talismn/icons"
import type { ScaleApiSubmitMode } from "@talismn/sapi"
import { cn } from "@talismn/util"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import type { SignerPayloadJSON, WalletTransactionInfo } from "extension-core"
import type { FC, PropsWithChildren, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Button, type ButtonProps, Toggle, useOpenClose } from "talisman-ui"
import type { Hex } from "viem"
import { MevShieldInfoModal } from "./MevShieldInfoModal"

type SwapInputsContainerProps = PropsWithChildren<{
  label: ReactNode
  variant: "buy" | "sell"
}>

export const SwapInputsContainer: FC<SwapInputsContainerProps> = ({ label, variant, children }) => (
  <div className="flex w-full flex-col gap-5 overflow-hidden">
    <div className={cn("pl-2 text-sm", variant === "buy" ? "text-buy" : "text-sell")}>{label}</div>
    <div className="w-full overflow-hidden">{children}</div>
  </div>
)

type SwapDetailsRowProps = PropsWithChildren<{
  label: ReactNode
  valueClassName?: string
}>

export const SwapDetailsRow: FC<SwapDetailsRowProps> = ({ label, valueClassName, children }) => (
  <div className="flex h-14 w-full items-center justify-between text-sm">
    <div className="text-body-secondary">{label}</div>
    <div className={valueClassName}>{children}</div>
  </div>
)

type SwapPriceImpactProps = {
  priceImpact: number | null | undefined
  isLoading?: boolean
}

export const SwapPriceImpact: FC<SwapPriceImpactProps> = ({ priceImpact, isLoading }) => {
  const { t } = useTranslation()

  if (typeof priceImpact === "number") {
    return (
      <div
        className={cn(
          isLoading && "animate-pulse",
          priceImpact > 0.5 && "text-alert-warn",
          priceImpact > 2 && "text-alert-error"
        )}
      >
        ~{priceImpact.toFixed(2)}%
      </div>
    )
  }

  if (isLoading)
    return <div className="animate-pulse rounded-xs bg-body-disabled text-body-disabled">0.00%</div>

  return t("N/A")
}

type SwapFeeEstimateProps = {
  tokenId?: TokenId | null
  feeEstimate?: bigint | null
  isLoading?: boolean
  error?: unknown
}

export const SwapFeeEstimate: FC<SwapFeeEstimateProps> = ({
  tokenId,
  feeEstimate,
  isLoading,
  error,
}) => {
  const { t } = useTranslation()

  if (!tokenId) return null

  if (typeof feeEstimate === "bigint")
    return (
      <TokensAndFiat
        tokenId={tokenId}
        planck={feeEstimate}
        className={cn("text-body-secondary", isLoading && "animate-pulse")}
        tokensClassName="text-body"
      />
    )

  if (isLoading) {
    return (
      <TokensAndFiat
        tokenId={tokenId}
        planck={1_234_567n}
        className="animate-pulse rounded-xs bg-body-disabled text-body-disabled"
      />
    )
  }

  if (error) {
    return <div className="text-alert-warn">{t("Failed to estimate fee")}</div>
  }

  return <div>{t("N/A")}</div>
}

type SwapMevShieldRowProps = {
  withMevShield: boolean
  isMevShieldDisabled: boolean
  setIsMevProtectionEnabled: (enabled: boolean) => void
}

export const SwapMevShieldRow: FC<SwapMevShieldRowProps> = ({
  withMevShield,
  isMevShieldDisabled,
  setIsMevProtectionEnabled,
}) => {
  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()

  return (
    <div className="flex h-14 items-center justify-end gap-2 text-body-secondary text-sm">
      <Toggle
        variant="sm"
        checked={withMevShield}
        disabled={isMevShieldDisabled}
        onChange={(e) => setIsMevProtectionEnabled(e.target.checked)}
      >
        {t("Use MEV Shield")}
      </Toggle>
      <button type="button" className="whitespace-nowrap hover:text-body" onClick={open}>
        <InfoIcon className="inline" />
      </button>
      <MevShieldInfoModal isOpen={isOpen} onClose={close} />
    </div>
  )
}

type SwapSlippageRowProps = {
  slippage: number
  onEdit?: () => void
}

export const SwapSlippageRow: FC<SwapSlippageRowProps> = ({ slippage, onEdit }) => {
  if (onEdit) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="flex cursor-pointer items-center gap-2 rounded-xl pl-2 font-light"
      >
        <EditIcon />
        <div>{slippage.toFixed(2)}%</div>
      </button>
    )
  }

  return <div>{slippage.toFixed(2)}%</div>
}

type SwapSubmitButtonProps = {
  label: string
  color?: ButtonProps["color"]
  payload?: SignerPayloadJSON
  txMetadata?: Uint8Array | `0x${string}`
  txInfo?: WalletTransactionInfo
  canSubmit: boolean
  txMode?: ScaleApiSubmitMode
  onSubmitted: (hash: Hex, innerHash?: Hex) => void
  className?: string
  containerId?: string
}

export const SwapSubmitButton: FC<SwapSubmitButtonProps> = ({
  label,
  color,
  payload,
  txMetadata,
  txInfo,
  canSubmit,
  txMode,
  onSubmitted,
  className,
  containerId,
}) => {
  // if there is no payload, sapi button for ledger will display an error and incorrect styling
  // TODO check that displaying the error is intended, display a placeholder until then
  if (!payload) {
    return (
      <Button
        type="button"
        disabled
        className={cn("h-24 w-full rounded border-none font-bold text-black uppercase", className)}
        color={color}
      >
        {label}
      </Button>
    )
  }

  return (
    <SapiSendButton
      containerId={containerId}
      className={cn("h-24 w-full rounded border-none font-bold text-black uppercase", className)}
      payload={payload}
      txMetadata={txMetadata}
      txInfo={txInfo}
      mode={txMode}
      color={color}
      label={label}
      disabled={!canSubmit}
      onSubmitted={onSubmitted}
    />
  )
}
