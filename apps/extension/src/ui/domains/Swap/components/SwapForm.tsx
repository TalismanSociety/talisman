import { isAccountOwned } from "@core/domains/keyring/exports"
import { useSyncSwapsChaindata } from "@talismn/balances-react"
import { AlertCircleIcon, LoaderIcon } from "@talismn/icons"
import { classNames, cn, planckToTokens } from "@talismn/util"
import { Button } from "@ui/components/Button"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useAccountsMap } from "@ui/state/accounts"
import { useNetworkById } from "@ui/state/chaindata"
import { type FC, type ReactNode, useCallback, useEffect, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useSwap } from "../SwapProvider"
import type { SwappableAssetWithDecimals } from "../swap-modules/common.swap-module"
import { ReverseButton } from "./ReverseButton"
import { SeparatedAccountSelector } from "./SeparatedAccountSelector"
import { SwapDetails } from "./SwapDetails"
import { TokenAmountInput } from "./TokenAmountInput"

const assetAccountsType = (asset?: SwappableAssetWithDecimals | null) => {
  if (!asset) return "all"
  if (asset.id === "btc-native") return "btc"
  if (asset.networkType === "evm") return "ethereum"
  return "substrate"
}

export const SwapForm = () => {
  const { t } = useTranslation()

  const {
    swapView,
    fastBalance,
    setSwapView,
    selectedQuote,
    fromAddress,
    fromAsset,
    setFromAsset,
    fromAmount,
    setFromAmount,
    toAddress,
    toAsset,
    setToAsset,
    toAmount,
    fromAssets,
    toAssets,
    isLoadingQuotes,
    isAllQuotesSettled,
    sortedQuotes,
    hasQuoteError,
    reverse,
    erc20Approval: { data: approvalData, loading: approvalLoading },
    setFromAddress,
    setToAddress,
  } = useSwap()

  const toNetwork = useNetworkById(String(toAsset?.chainId ?? ""))

  const accountsMap = useAccountsMap()
  const toAccount = toAddress ? accountsMap[toAddress] : null
  const toIsWatched = toAccount?.type === "watch-only"
  const toIsExternal = !toAccount || toAccount.type === "contact"

  useSyncSwapsChaindata()

  const isApproveRecipient = swapView === "approve-recipient"

  useEffect(() => {
    if (isApproveRecipient && !(toIsWatched || toIsExternal)) setSwapView("form")
  }, [isApproveRecipient, setSwapView, toIsExternal, toIsWatched])

  const handleChangeFromAsset = useCallback(
    (asset: SwappableAssetWithDecimals | null) => {
      if (asset && toAsset && asset.id === toAsset.id) reverse()
      else setFromAsset(asset)
    },
    [reverse, setFromAsset, toAsset]
  )

  const handleChangeToAsset = useCallback(
    (asset: SwappableAssetWithDecimals | null) => {
      if (asset && fromAsset && asset.id === fromAsset.id) reverse()
      else setToAsset(asset)
    },
    [fromAsset, reverse, setToAsset]
  )

  const insufficientBalance = useMemo(() => {
    if (!fastBalance?.balance) return undefined
    return fromAmount > fastBalance.balance.transferable
  }, [fastBalance, fromAmount])

  const isSwappingFromBtc = fromAsset?.id === "btc-native"
  const shouldShowFromAccount = !!fromAsset && !isSwappingFromBtc
  const shouldShowToAccount = !!fromAsset && !!toAsset && !isSwappingFromBtc
  const hasError =
    insufficientBalance === true ||
    (hasQuoteError && sortedQuotes.length === 0) ||
    (sortedQuotes.length === 0 && isAllQuotesSettled && !!fromAmount && !!toAsset)

  return (
    <div className="mb-52 flex h-full w-full flex-col gap-8 overflow-y-auto px-12">
      {/* Input cards section */}
      <div className="flex flex-col">
        {/* FROM Card */}
        <div
          className={classNames(
            "relative flex flex-col gap-8 rounded bg-grey-900 px-6 py-8"
            //insufficientBalance && "outline outline-alert-error/50"
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-0 rounded border border-alert-error/50",
              insufficientBalance ? "visible" : "invisible"
            )}
          ></div>
          <TokenAmountInput
            assets={fromAssets}
            amount={fromAmount}
            onChangeAmount={setFromAmount}
            selectedAsset={fromAsset}
            availableBalance={fastBalance?.balance?.transferable}
            stayAliveBalance={fastBalance?.balance?.stayAlive}
            onChangeAsset={handleChangeFromAsset}
            priorityMode="sell"
          />
          {/* <div
            aria-hidden={!insufficientBalance}
            className={cn(
              "invisible flex h-12 shrink-0 items-center text-right text-alert-error text-xs leading-paragraph"
              // insufficientBalance ? "visible" : "invisible"
            )}
          >
            {t("Insufficient balance")}
          </div> */}
          {shouldShowFromAccount && (
            <div className="flex items-center justify-between">
              <SeparatedAccountSelector
                compact
                title={t("Sender")}
                subtitle={t("From")}
                asset={fromAsset}
                accountsType={assetAccountsType(fromAsset)}
                disableBtc
                substrateAccountPrefix={0}
                substrateAccountsFilter={isAccountOwned}
                evmAccountsFilter={isAccountOwned}
                value={fromAddress}
                onAccountChange={setFromAddress}
              />
              <AvailableBalance
                asset={fromAsset}
                balance={fastBalance?.balance?.transferable}
                highlight={insufficientBalance === true}
              />
            </div>
          )}
        </div>

        {/* Reverse Button */}
        <ReverseButton hasError={hasError} />

        {/* TO Card */}
        <div className="flex flex-col gap-8 rounded bg-grey-900 px-6 py-8">
          <TokenAmountInput
            amount={toAmount ?? undefined}
            assets={toAssets}
            selectedAsset={toAsset}
            onChangeAsset={handleChangeToAsset}
            disabled
            showFiat={false}
            priorityMode="buy"
          />
          {shouldShowToAccount && (
            <div className="flex items-center justify-between">
              <SeparatedAccountSelector
                compact
                title={t("Recipient")}
                subtitle={t("To")}
                allowInput
                allowZeroBalance
                asset={toAsset}
                accountsType={assetAccountsType(toAsset)}
                substrateAccountPrefix={0}
                substrateAccountsFilter={isAccountOwned}
                value={toAddress}
                onAccountChange={setToAddress}
              />
            </div>
          )}
        </div>
      </div>

      <SwapDetails />

      <div className="absolute bottom-0 left-0 w-full bg-black px-12 py-8">
        {fromAsset?.networkType === "btc" && (
          <Button className="!w-full !rounded" disabled>
            {t("Swapping from BTC is not supported")}
          </Button>
        )}

        {["evm", "substrate"].includes(fromAsset?.networkType ?? "") && approvalData && (
          <Button className="!w-full !rounded" primary onClick={() => setSwapView("approve-erc20")}>
            {t(`Allow {{protocolName}} to spend {{symbol}}`, {
              protocolName: approvalData.protocolName,
              symbol: fromAsset?.symbol,
            })}
          </Button>
        )}

        {["evm", "substrate"].includes(fromAsset?.networkType ?? "") && !approvalData && (
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
              if (!fastBalance?.balance) return

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
                  <AlertCircleIcon /> Sending {toAsset?.symbol} to a watch-only account on{" "}
                  {toNetwork?.name}.
                </Trans>
              )}
              {toIsExternal && (
                <Trans t={t}>
                  <AlertCircleIcon /> Sending {toAsset?.symbol} to an external account on{" "}
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

const AvailableBalance = ({
  asset,
  balance,
  highlight,
}: {
  asset?: SwappableAssetWithDecimals | null
  balance?: bigint
  highlight?: boolean
}) => {
  const { t } = useTranslation()
  if (!asset || balance === undefined) return null
  const amount = planckToTokens(balance.toString(), asset.decimals) ?? "0"
  return (
    <span className={classNames("text-[11px]", highlight ? "text-white" : "text-body-disabled")}>
      {t("Available:")} <Tokens amount={amount} symbol={asset.symbol} noCountUp />
    </span>
  )
}

// TODO use this for token in and token out
const _TokenAndAmountContainer: FC<{
  tokenButton: ReactNode
  tokenAmount: ReactNode
  accountButton: ReactNode
  accountBalance: ReactNode
  isError: boolean
}> = ({ tokenButton, tokenAmount, accountButton, accountBalance, isError }) => {
  return (
    <div className={cn("relative w-full overflow-hidden rounded bg-grey-900 px-6 py-8")}>
      <div className="flex w-full justify-between overflow-hidden">
        <div>{tokenButton}</div>
        <div>{tokenAmount}</div>
      </div>
      <div className="flex w-full justify-between overflow-hidden">
        <div>{accountButton}</div>
        <div>{accountBalance}</div>
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-0 rounded border border-alert-error/50",
          isError ? "visible" : "invisible"
        )}
      ></div>
    </div>
  )
}
