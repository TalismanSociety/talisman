import { AlertCircleIcon, LoaderIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { useAccountsMap } from "@ui/state/accounts"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useCallback, useEffect, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useSwapTokensModal } from "../hooks/useSwapTokensModal"
import { useSwap } from "../SwapProvider"
import { AvailableBalance } from "./AvailableBalance"
import { InputFromAmount } from "./InputFromAmount"
import { ReverseButton } from "./ReverseButton"
import { SelectTokenButton } from "./SelectTokenButton"
import { SwapAccountPicker } from "./SwapAccountPicker"
import { SwapProviderPickerButton } from "./SwapProviderPickerButton"
import { ToAmountDisplay } from "./ToAmountDisplay"
import { TokenAndAmountContainer } from "./TokenAndAmountContainer"

export const SwapForm = () => {
  const { t } = useTranslation()
  const { close } = useSwapTokensModal()

  const {
    swapView,
    fromBalance,
    toBalance,
    setSwapView,
    selectedQuote,
    fromAddress,
    fromTokenId,
    setFromTokenId,
    fromAmount,
    onMaxFromAmountClick,
    toAddress,
    toTokenId,
    setToTokenId,
    toAmount,
    fromAssetIds,
    toAssetIds,
    isLoadingQuotes,
    isQuoteDataCurrent,
    isAllQuotesSettled,
    sortedQuotes,
    hasQuoteError,
    reverse,
    setFromAddress,
    setToAddress,
  } = useSwap()

  const toToken = useToken(toTokenId ?? undefined)
  const toNetwork = useNetworkById(toToken?.networkId)

  const accountsMap = useAccountsMap()
  const toAccount = toAddress ? accountsMap[toAddress] : null
  const toIsWatched = toAccount?.type === "watch-only"
  const toIsExternal = !toAccount || toAccount.type === "contact"

  const isApproveRecipient = swapView === "approve-recipient"

  useEffect(() => {
    if (isApproveRecipient && !(toIsWatched || toIsExternal)) setSwapView("form")
  }, [isApproveRecipient, setSwapView, toIsExternal, toIsWatched])

  const handleChangeToToken = useCallback(
    (tokenId: string | null) => {
      if (tokenId && fromTokenId && tokenId === fromTokenId) reverse()
      else setToTokenId(tokenId)
    },
    [fromTokenId, reverse, setToTokenId]
  )

  const handleChangeFromToken = useCallback(
    (tokenId: string | null) => {
      if (tokenId && toTokenId && tokenId === toTokenId) reverse()
      else setFromTokenId(tokenId)
    },
    [toTokenId, reverse, setFromTokenId]
  )

  const insufficientBalance = useMemo(() => {
    if (!fromBalance || !fromAmount) return undefined
    const gasBuffer = BigInt(selectedQuote?.maxNativeTokenGasBuffer ?? "0")
    return fromAmount + gasBuffer > fromBalance.transferable.planck
  }, [fromBalance, fromAmount, selectedQuote?.maxNativeTokenGasBuffer])

  const hasError =
    insufficientBalance === true ||
    (hasQuoteError && sortedQuotes.length === 0) ||
    (sortedQuotes.length === 0 && isAllQuotesSettled && !!fromAmount && !!toTokenId)

  return (
    <WizardModalDialog
      className="size-full border-none"
      title={t("Multi-chain Swap")}
      onCloseClick={close}
      contentClassName="relative !overflow-hidden !p-0"
    >
      <div className="mb-52 flex h-full w-full flex-col gap-8 overflow-y-auto px-12">
        <div className="relative flex flex-col gap-6">
          <TokenAndAmountContainer
            tokenButton={
              <SelectTokenButton
                onSelectTokenId={handleChangeFromToken}
                selectedTokenId={fromTokenId}
                allowedTokenIds={fromAssetIds}
                priorityMode="sell"
              />
            }
            tokenAmount={<InputFromAmount />}
            accountButton={
              <SwapAccountPicker
                title={t("Sender")}
                subtitle={t("From")}
                tokenId={fromTokenId}
                value={fromAddress}
                onAccountChange={setFromAddress}
              />
            }
            accountBalance={
              <AvailableBalance balance={fromBalance} onMaxClick={onMaxFromAmountClick} />
            }
            isError={!!insufficientBalance}
          />

          <TokenAndAmountContainer
            tokenButton={
              <SelectTokenButton
                onSelectTokenId={handleChangeToToken}
                selectedTokenId={toTokenId}
                allowedTokenIds={toAssetIds}
                priorityMode="buy"
              />
            }
            tokenAmount={<ToAmountDisplay />}
            accountButton={
              <SwapAccountPicker
                title={t("Recipient")}
                subtitle={t("To")}
                allowInput
                allowZeroBalance
                tokenId={toTokenId}
                value={toAddress}
                onAccountChange={setToAddress}
              />
            }
            accountBalance={<AvailableBalance balance={toBalance} />}
            isError={false}
          />

          <ReverseButton
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            hasError={hasError}
          />
        </div>

        <SwapProviderPickerButton />

        <div className="absolute bottom-0 left-0 w-full bg-black px-12 py-8 pb-12">
          <Button
            className="!w-full !rounded disabled:!bg-[#262626] disabled:!text-body-disabled"
            primary
            disabled={
              !toAmount ||
              toAmount === 0n ||
              !fromAddress ||
              !toAddress ||
              insufficientBalance !== false ||
              isLoadingQuotes ||
              !isQuoteDataCurrent
            }
            onClick={() => {
              if (!selectedQuote) return
              if (!fromBalance?.transferable?.planck) return

              // if toAddress isn't an owned account, show a warning to the user
              if (toIsExternal || toIsWatched) return setSwapView("approve-recipient")

              setSwapView("confirm")
            }}
          >
            {t("Review")}
          </Button>

          <Drawer
            isOpen={isApproveRecipient}
            onDismiss={() => setSwapView("form")}
            anchor="bottom"
            containerId="swap-modal"
          >
            <div className="flex animate-slide-in-up flex-col gap-12 rounded bg-black-tertiary p-12">
              <div className="flex items-center gap-4 text-orange-400 text-sm">
                {toIsWatched && (
                  <Trans t={t}>
                    <AlertCircleIcon className="size-16" /> Sending {toToken?.symbol} to a
                    watch-only account on {toNetwork?.name}.
                  </Trans>
                )}
                {toIsExternal && (
                  <Trans t={t}>
                    <AlertCircleIcon className="size-16" /> Sending {toToken?.symbol} to an external
                    account on {toNetwork?.name}.
                  </Trans>
                )}
              </div>
              <div className="grid grid-cols-2 gap-8">
                <Button onClick={() => setSwapView("form")}>{t("Cancel")}</Button>
                <Button primary onClick={() => setSwapView("confirm")}>
                  {t("Proceed")}
                </Button>
              </div>
            </div>
          </Drawer>
        </div>
      </div>
    </WizardModalDialog>
  )
}

export const SwapFormShimmer = () => {
  const { t } = useTranslation()
  const { close } = useSwapTokensModal()

  return (
    <WizardModalDialog
      className="size-full border-none"
      title={t("Multi-chain Swap")}
      onCloseClick={close}
    >
      <div className="flex flex-col items-center gap-2 pt-64 text-body-secondary leading-[140%]">
        <LoaderIcon className="h-16 w-16 animate-spin-slow" />
        <div className="mt-4 font-bold text-base text-white opacity-70">
          {t("Loading tokens lists")}
        </div>
        <div className="font-normal text-sm opacity-70">{t("This shouldn't take long...")}</div>
      </div>
    </WizardModalDialog>
  )
}
