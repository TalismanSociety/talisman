import { EditIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { type FC, type PropsWithChildren, type ReactNode, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Toggle } from "talisman-ui"
import { BittensorSlippageModal } from "./BittensorSlippageModal"
import { BITTENSOR_SWAP_CONTAINER_ID } from "./common"
import { SwapBuyInput } from "./SwapBuyInput"
import { SwapBuyOutput } from "./SwapBuyOutput"
import { SwapBuyProvider, useSwapBuy } from "./SwapBuyProvider"
import { useBittensorSlippageModal } from "./useBittensorSlippageModal"

export const SwapTabContentBuy: FC<{ netuid: number }> = ({ netuid }) => (
  <SwapBuyProvider netuid={netuid}>
    <SwapTabContentBuyInner />
  </SwapBuyProvider>
)

const SwapTabContentBuyInner: FC = () => {
  const { t } = useTranslation()

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <div className="flex w-full grow flex-col gap-10 overflow-hidden p-8">
        <InputsContainer label={t("Spend")}>
          <SwapBuyInput />
        </InputsContainer>
        <InputsContainer label={t("Receive")}>
          <SwapBuyOutput />
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
            <SlippageEdit />
          </DetailsRow>
          <div className="flex h-14 items-center justify-end text-body-secondary text-sm">
            <Toggle variant="sm">{t("Use MEV Shield")}</Toggle>
          </div>
        </div>
        <SubmitButton />
      </div>
      <BittensorSlippageModal />
    </div>
  )
}

const SubmitButton = () => {
  const { t } = useTranslation()
  const { payload, txMetadata, txInfo, canSubmit, onSubmit } = useSwapBuy()

  // if there is no payload, sapi button for ledger will display an error and incorrect styling
  // TODO check that displaying the error is intended
  // use a placeholder until then
  if (!payload) {
    return (
      <button
        type="button"
        disabled
        className="h-24 w-full rounded border-none bg-buy/50 font-bold text-black uppercase"
      >
        {t("Buy")}
      </button>
    )
  }

  return (
    <SapiSendButton
      containerId={BITTENSOR_SWAP_CONTAINER_ID}
      className="h-24 w-full rounded border-none font-bold text-black uppercase"
      payload={payload}
      txMetadata={txMetadata}
      txInfo={txInfo}
      color="buy"
      label={t("Buy")}
      // TODO mode=""
      disabled={!canSubmit}
      onSubmitted={onSubmit}
    />
  )
}

const PriceImpact = () => {
  const { t } = useTranslation()
  const { priceImpact, isLoading } = useSwapBuy()

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
  const { feeEstimate, isLoadingFeeEstimate, errorFeeEstimate, tokenIdIn } = useSwapBuy()

  if (!tokenIdIn) return null

  if (typeof feeEstimate === "bigint")
    return (
      <TokensAndFiat
        tokenId={tokenIdIn}
        planck={feeEstimate}
        className={cn("text-body-secondary", isLoadingFeeEstimate && "animate-pulse")}
        tokensClassName="text-body"
      />
    )

  if (isLoadingFeeEstimate) {
    return (
      <TokensAndFiat
        tokenId={tokenIdIn}
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

const SlippageEdit = () => {
  const { slippage, netuid } = useSwapBuy()
  const { open } = useBittensorSlippageModal()

  const handleClick = useCallback(() => {
    open({ netuid })
  }, [open, netuid])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={"flex cursor-pointer items-center gap-2 rounded-xl pl-2 font-light"}
    >
      <EditIcon />
      <div>{slippage.toFixed(2)}%</div>
    </button>
  )
}

const InputsContainer: FC<PropsWithChildren<{ label: ReactNode }>> = ({ label, children }) => (
  <div className="flex w-full flex-col gap-5 overflow-hidden">
    <div className="pl-2 text-buy text-sm">{label}</div>
    <div className="w-full overflow-hidden">{children}</div>
  </div>
)

const DetailsRow: FC<PropsWithChildren<{ label: ReactNode }>> = ({ label, children }) => (
  <div className="flex h-14 w-full items-center justify-between text-sm">
    <div className="text-body-secondary">{label}</div>
    <div className="font-medium">{children}</div>
  </div>
)
