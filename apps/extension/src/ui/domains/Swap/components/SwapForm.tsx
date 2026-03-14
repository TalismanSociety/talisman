import { useSyncSwapsChaindata } from "@talismn/balances-react"
import { AlertCircleIcon, LoaderIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { useAccountsMap } from "@ui/state/accounts"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useCallback, useEffect, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
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
    isAllQuotesSettled,
    sortedQuotes,
    hasQuoteError,
    reverse,
    erc20Approval: { loading: approvalLoading },
    setFromAddress,
    setToAddress,
  } = useSwap()

  const fromToken = useToken(fromTokenId ?? undefined)
  const toToken = useToken(toTokenId ?? undefined)
  const toNetwork = useNetworkById(toToken?.networkId)

  const accountsMap = useAccountsMap()
  const toAccount = toAddress ? accountsMap[toAddress] : null
  const toIsWatched = toAccount?.type === "watch-only"
  const toIsExternal = !toAccount || toAccount.type === "contact"

  useSyncSwapsChaindata()

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

  const insufficientBalance = useMemo(() => {
    if (!fromBalance || !fromAmount) return undefined
    return fromAmount > fromBalance.transferable.planck
  }, [fromBalance, fromAmount])

  const _shouldShowToAccount = !!fromTokenId && !!toTokenId
  const fromNetworkType =
    fromToken?.platform === "ethereum"
      ? "evm"
      : fromToken?.platform === "polkadot"
        ? "substrate"
        : null
  const hasError =
    insufficientBalance === true ||
    (hasQuoteError && sortedQuotes.length === 0) ||
    (sortedQuotes.length === 0 && isAllQuotesSettled && !!fromAmount && !!toTokenId)

  return (
    <div className="mb-52 flex h-full w-full flex-col gap-8 overflow-y-auto px-12">
      <div className="relative flex flex-col gap-6">
        <TokenAndAmountContainer
          tokenButton={
            <SelectTokenButton
              onSelectTokenId={setFromTokenId}
              selectedTokenId={fromTokenId}
              assetIds={fromAssetIds}
              priorityMode="sell"
            />
          }
          tokenAmount={<InputFromAmount />}
          accountButton={
            <SwapAccountPicker
              compact
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
              assetIds={toAssetIds}
              priorityMode="buy"
            />
          }
          tokenAmount={<ToAmountDisplay />}
          accountButton={
            <SwapAccountPicker
              compact
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

      <div className="absolute bottom-0 left-0 w-full bg-black px-12 py-8">
        {fromNetworkType && (
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
              !isAllQuotesSettled ||
              approvalLoading
            }
            onClick={() => {
              if (!selectedQuote) return
              if (!fromBalance?.transferable?.planck) return

              // if toAddress isn't an owned account, show a warning to the user
              if (toIsExternal || toIsWatched) return setSwapView("approve-recipient")

              setSwapView("confirm")
            }}
          >
            {approvalLoading ? (
              <LoaderIcon className="animate-spin-slow text-body-disabled" />
            ) : (
              t("Review")
            )}
          </Button>
        )}

        {isApproveRecipient && (
          <div className="absolute bottom-0 left-0 m-8 flex animate-slide-in-up flex-col gap-8 rounded bg-black-tertiary p-8">
            <div className="flex items-center gap-3 text-orange-400 text-sm">
              {toIsWatched && (
                <Trans t={t}>
                  <AlertCircleIcon /> Sending {toToken?.symbol} to a watch-only account on{" "}
                  {toNetwork?.name}.
                </Trans>
              )}
              {toIsExternal && (
                <Trans t={t}>
                  <AlertCircleIcon /> Sending {toToken?.symbol} to an external account on{" "}
                  {toNetwork?.name}.
                </Trans>
              )}
            </div>
            <div className="flex gap-8">
              <Button className="!w-full !rounded" small onClick={() => setSwapView("form")}>
                {t("Cancel")}
              </Button>
              <Button
                className="!w-full !rounded"
                small
                primary
                onClick={() => setSwapView("confirm")}
              >
                {t("Proceed")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
