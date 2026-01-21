import { InfoIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import type { FC, PropsWithChildren, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Button, Toggle, useOpenClose } from "talisman-ui"
import { BITTENSOR_SWAP_CONTAINER_ID } from "./common"
import { MevShieldInfoModal } from "./MevShieldInfoModal"
import { SwapSellInput } from "./SwapSellInput"
import { SwapSellOutput } from "./SwapSellOutput"
import { SwapSellProvider, useSwapSell } from "./SwapSellProvider"

export const SwapTabContentSell: FC<{ netuid: number }> = ({ netuid }) => (
  <SwapSellProvider netuid={netuid}>
    <SwapTabContentSellInner />
  </SwapSellProvider>
)

const SwapTabContentSellInner: FC = () => {
  const { t } = useTranslation()

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <div className="flex w-full grow flex-col gap-10 overflow-hidden p-8">
        <InputsContainer label={t("Spend")}>
          <SwapSellInput />
        </InputsContainer>
        <InputsContainer label={t("Receive")}>
          <SwapSellOutput />
        </InputsContainer>
      </div>
      <div className="flex w-full flex-col gap-5 overflow-hidden border-black-tertiary border-t bg-[#202020] p-10 pt-5">
        <div className="flex w-full flex-col overflow-hidden">
          <DetailsRow label={t("Estimated Fee")}>
            <FeeEstimate />
          </DetailsRow>
          <DetailsRow label={t("Price Impact")}>
            <PriceImpact />
          </DetailsRow>
          <DetailsRow label={t("Max Slippage")}>
            <SlippageDisplay />
          </DetailsRow>
          <MevShieldRow />
        </div>
        <SubmitButton />
      </div>
    </div>
  )
}

const SubmitButton = () => {
  const { t } = useTranslation()
  const { payload, txMetadata, txInfo, canSubmit, txMode, onSubmit } = useSwapSell()

  if (!payload) {
    return (
      <Button
        type="button"
        disabled
        className="h-24 w-full rounded border-none font-bold text-black uppercase"
        color="sell"
      >
        {t("Sell")}
      </Button>
    )
  }

  return (
    <SapiSendButton
      containerId={BITTENSOR_SWAP_CONTAINER_ID}
      className="h-24 w-full rounded border-none font-bold text-black uppercase"
      payload={payload}
      txMetadata={txMetadata}
      txInfo={txInfo}
      mode={txMode}
      color="sell"
      label={t("Sell")}
      disabled={!canSubmit}
      onSubmitted={onSubmit}
    />
  )
}

const MevShieldRow = () => {
  const { t } = useTranslation()
  const { isMevShieldDisabled, withMevShield, setIsMevProtectionEnabled } = useSwapSell()
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

const PriceImpact = () => {
  const { t } = useTranslation()
  const { priceImpact, isLoading } = useSwapSell()

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

const FeeEstimate = () => {
  const { t } = useTranslation()
  const { feeEstimate, isLoadingFeeEstimate, errorFeeEstimate, tokenIdOut } = useSwapSell()

  if (!tokenIdOut) return null

  if (typeof feeEstimate === "bigint")
    return (
      <TokensAndFiat
        tokenId={tokenIdOut}
        planck={feeEstimate}
        className={cn("text-body-secondary", isLoadingFeeEstimate && "animate-pulse")}
        tokensClassName="text-body"
      />
    )

  if (isLoadingFeeEstimate) {
    return (
      <TokensAndFiat
        tokenId={tokenIdOut}
        planck={1_234_567n}
        className="animate-pulse rounded-xs bg-body-disabled text-body-disabled"
      />
    )
  }

  if (errorFeeEstimate) {
    return <div className="text-alert-warn">{t("Failed to estimate fee")}</div>
  }

  return <div>{t("N/A")}</div>
}

const SlippageDisplay = () => {
  const { slippage } = useSwapSell()

  return <div>{slippage.toFixed(2)}%</div>
}

const InputsContainer: FC<PropsWithChildren<{ label: ReactNode }>> = ({ label, children }) => (
  <div className="flex w-full flex-col gap-5 overflow-hidden">
    <div className="pl-2 text-sell text-sm">{label}</div>
    <div className="w-full overflow-hidden">{children}</div>
  </div>
)

const DetailsRow: FC<PropsWithChildren<{ label: ReactNode }>> = ({ label, children }) => (
  <div className="flex h-14 w-full items-center justify-between text-sm">
    <div className="text-body-secondary">{label}</div>
    <div>{children}</div>
  </div>
)
