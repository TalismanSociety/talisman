import { isAccountOwned } from "@core/domains/keyring/exports"
import { useSyncSwapsChaindata } from "@talismn/balances-react"
import { AlertCircleIcon, LoaderIcon } from "@talismn/icons"
import { classNames, cn, planckToTokens } from "@talismn/util"
import { Button } from "@ui/components/Button"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useAccountsMap } from "@ui/state/accounts"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { type FC, type ReactNode, useCallback, useEffect, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useSwap } from "../SwapProvider"
import { ReverseButton } from "./ReverseButton"
import { SeparatedAccountSelector } from "./SeparatedAccountSelector"
import { SwapDetails } from "./SwapDetails"
import { TokenAmountInput } from "./TokenAmountInput"

const tokenAccountsType = (token: { platform?: string; id?: string } | null | undefined) => {
  if (!token) return "all"
  if (token.id === "btc-native") return "btc"
  if (token.platform === "ethereum") return "ethereum"
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
    fromTokenId,
    setFromTokenId,
    fromAmount,
    setFromAmount,
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
    erc20Approval: { data: approvalData, loading: approvalLoading },
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

  const handleChangeFromToken = useCallback(
    (tokenId: string | null) => {
      if (tokenId && toTokenId && tokenId === toTokenId) reverse()
      else setFromTokenId(tokenId)
    },
    [reverse, setFromTokenId, toTokenId]
  )

  const handleChangeToToken = useCallback(
    (tokenId: string | null) => {
      if (tokenId && fromTokenId && tokenId === fromTokenId) reverse()
      else setToTokenId(tokenId)
    },
    [fromTokenId, reverse, setToTokenId]
  )

  const insufficientBalance = useMemo(() => {
    if (!fastBalance?.balance) return undefined
    return fromAmount > fastBalance.balance.transferable
  }, [fastBalance, fromAmount])

  const isSwappingFromBtc = fromTokenId === "btc-native"
  const shouldShowFromAccount = !!fromTokenId && !isSwappingFromBtc
  const shouldShowToAccount = !!fromTokenId && !!toTokenId && !isSwappingFromBtc
  const fromNetworkType =
    fromToken?.platform === "ethereum"
      ? "evm"
      : fromToken?.platform === "polkadot"
        ? "substrate"
        : fromTokenId === "btc-native"
          ? "btc"
          : null
  const hasError =
    insufficientBalance === true ||
    (hasQuoteError && sortedQuotes.length === 0) ||
    (sortedQuotes.length === 0 && isAllQuotesSettled && !!fromAmount && !!toTokenId)

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
            assetIds={fromAssetIds}
            amount={fromAmount}
            onChangeAmount={setFromAmount}
            selectedTokenId={fromTokenId}
            availableBalance={fastBalance?.balance?.transferable}
            stayAliveBalance={fastBalance?.balance?.stayAlive}
            onChangeTokenId={handleChangeFromToken}
            priorityMode="sell"
          />
          {shouldShowFromAccount && (
            <div className="flex items-center justify-between">
              <SeparatedAccountSelector
                compact
                title={t("Sender")}
                subtitle={t("From")}
                tokenId={fromTokenId}
                accountsType={tokenAccountsType(fromToken)}
                disableBtc
                substrateAccountPrefix={0}
                substrateAccountsFilter={isAccountOwned}
                evmAccountsFilter={isAccountOwned}
                value={fromAddress}
                onAccountChange={setFromAddress}
              />
              <AvailableBalance
                tokenId={fromTokenId}
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
            assetIds={toAssetIds}
            selectedTokenId={toTokenId}
            onChangeTokenId={handleChangeToToken}
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
                tokenId={toTokenId}
                accountsType={tokenAccountsType(toToken)}
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
        {fromNetworkType === "btc" && (
          <Button className="!w-full !rounded" disabled>
            {t("Swapping from BTC is not supported")}
          </Button>
        )}

        {fromNetworkType && ["evm", "substrate"].includes(fromNetworkType) && approvalData && (
          <Button className="!w-full !rounded" primary onClick={() => setSwapView("approve-erc20")}>
            {t(`Allow {{protocolName}} to spend {{symbol}}`, {
              protocolName: approvalData.protocolName,
              symbol: fromToken?.symbol,
            })}
          </Button>
        )}

        {fromNetworkType && ["evm", "substrate"].includes(fromNetworkType) && !approvalData && (
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

const AvailableBalance = ({
  tokenId,
  balance,
  highlight,
}: {
  tokenId?: string | null
  balance?: bigint
  highlight?: boolean
}) => {
  const { t } = useTranslation()
  const token = useToken(tokenId ?? undefined)
  if (!token || balance === undefined) return null
  const amount = planckToTokens(balance.toString(), token.decimals) ?? "0"
  return (
    <span className={classNames("text-[11px]", highlight ? "text-white" : "text-body-disabled")}>
      {t("Available:")} <Tokens amount={amount} symbol={token.symbol} noCountUp />
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
