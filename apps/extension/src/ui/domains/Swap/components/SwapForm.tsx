import { isAccountOwned } from "@core/domains/keyring/exports"
import { useSyncSwapsChaindata } from "@talismn/balances-react"
import { AlertCircleIcon, ArrowUpDownIcon, LoaderIcon } from "@talismn/icons"
import { cn, isNotNil, planckToTokens, tokensToPlanck } from "@talismn/util"
import { Button } from "@ui/components/Button"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useAccountsMap } from "@ui/state/accounts"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useSelectedCurrency } from "@ui/state/settings"
import { useTokenRates } from "@ui/state/tokenRates"
import { type FC, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useSwap } from "../SwapProvider"
import { ReverseButton } from "./ReverseButton"
import { SelectTokenButton } from "./SelectTokenButton"
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
    fromBalance,
    setSwapView,
    selectedQuote,
    fromAddress,
    fromTokenId,
    setFromTokenId,
    fromAmount,
    // setFromAmount,
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

  // const handleChangeFromToken = useCallback(
  //   (tokenId: string | null) => {
  //     if (tokenId && toTokenId && tokenId === toTokenId) reverse()
  //     else setFromTokenId(tokenId)
  //   },
  //   [reverse, setFromTokenId, toTokenId]
  // )

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

  const isSwappingFromBtc = fromTokenId === "btc-native"
  // const shouldShowFromAccount = !!fromTokenId && !isSwappingFromBtc
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

  // const existentialDeposit = useExistentialDeposit(toTokenId)

  return (
    <div className="mb-52 flex h-full w-full flex-col gap-8 overflow-y-auto px-12">
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
        }
        accountBalance={<AvailableFromBalance />}
        isError={!!insufficientBalance}
      />

      {/* <TokenAndAmountContainer /> */}
      {/* Input cards section */}
      <div className="flex flex-col">
        {/* FROM Card */}
        {/* <div
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
            amount={fromAmount ?? undefined}
            onChangeAmount={setFromAmount}
            selectedTokenId={fromTokenId}
            availableBalance={fromBalance?.transferable?.planck}
            stayAliveBalance={existentialDeposit?.planck}
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
                balance={fromBalance?.transferable?.planck}
                highlight={insufficientBalance === true}
              />
            </div>
          )}
        </div> */}

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

const AvailableFromBalance = ({ className }: { className?: string }) => {
  const { fromBalance } = useSwap()
  const { t } = useTranslation()

  if (!fromBalance?.token) return null

  return (
    <div
      className={cn(
        "flex w-full items-center justify-end gap-2 overflow-hidden text-body-secondary text-xs",
        className
      )}
    >
      <div>{t("Bal:")}</div>
      <Tokens
        amount={fromBalance.transferable.tokens}
        symbol={fromBalance.token.symbol}
        noCountUp
      />
      <button type="button" className="rounded-xs border px-1 hover:bg-gray-750">
        {t("Max")}
      </button>
    </div>
  )
}

const InputFromAmount = () => {
  const currency = useSelectedCurrency()
  const { t } = useTranslation()

  const { fromBalance, fromTokenId, fromAmount, setFromAmount } = useSwap()

  const fromToken = useToken(fromTokenId ?? undefined)
  const tokenRates = useTokenRates(fromTokenId)

  const canEditFiat = useMemo(() => !!tokenRates?.[currency]?.price, [tokenRates, currency])

  const [editFiat, setEditFiat] = useState(false)
  const [value, setValue] = useState("")
  const refSkipSync = useRef(false)

  // Reset to token mode if fiat editing becomes unavailable
  useEffect(() => {
    if (!canEditFiat && editFiat) {
      setEditFiat(false)
      if (fromAmount && fromToken) {
        setValue(planckToTokens(fromAmount.toString(), fromToken.decimals) ?? "")
      }
    }
  }, [canEditFiat, editFiat, fromAmount, fromToken])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = e.target.value
      if (nextValue === "") {
        setValue("")
        return
      }
      const maxDecimals = editFiat ? 2 : (fromToken?.decimals ?? 18)
      const regex = new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}$`)
      if (regex.test(nextValue)) {
        setValue(nextValue)
      }
    },
    [editFiat, fromToken?.decimals]
  )

  // Sync fromAmount with input value
  useEffect(() => {
    if (refSkipSync.current) {
      refSkipSync.current = false
      return
    }

    if (!fromToken) {
      setFromAmount(null)
      return
    }

    if (!value) {
      setFromAmount(null)
      return
    }

    if (editFiat) {
      const tokenRate = tokenRates?.[currency]?.price
      if (!tokenRate) return
      try {
        const fiatAmount = Number.parseFloat(value)
        if (Number.isNaN(fiatAmount)) {
          setFromAmount(null)
          return
        }
        const tokens = (fiatAmount / tokenRate).toFixed(Math.ceil(fromToken.decimals / 3))
        const planck = tokensToPlanck(tokens, fromToken.decimals)
        if (isNotNil(planck)) setFromAmount(BigInt(planck))
        else setFromAmount(null)
      } catch {
        setFromAmount(null)
      }
    } else {
      try {
        const amount = tokensToPlanck(value === "0." ? "0" : value, fromToken.decimals)
        if (isNotNil(amount)) setFromAmount(BigInt(amount))
        else setFromAmount(null)
      } catch {
        setFromAmount(null)
      }
    }
  }, [value, fromToken, setFromAmount, editFiat, tokenRates, currency])

  // Fiat value for display (token mode) and toggle conversion
  const fiatValue = useMemo(() => {
    if (!fromAmount || !fromToken || !tokenRates) return null
    const rate = tokenRates[currency]?.price
    if (!rate) return null
    const tokenAmount = Number(planckToTokens(fromAmount.toString(), fromToken.decimals) ?? "0")
    return tokenAmount * rate
  }, [fromAmount, fromToken, tokenRates, currency])

  // Token display string for fiat mode second row
  const tokenDisplayValue = useMemo(
    () =>
      fromAmount && fromToken ? planckToTokens(fromAmount.toString(), fromToken.decimals) : null,
    [fromAmount, fromToken]
  )

  const toggleEditMode = useCallback(() => {
    refSkipSync.current = true
    if (editFiat) {
      setEditFiat(false)
      setValue(tokenDisplayValue ?? "")
    } else {
      setEditFiat(true)
      setValue(fiatValue !== null ? fiatValue.toFixed(2) : "")
    }
  }, [editFiat, fiatValue, tokenDisplayValue])

  const [errorClassName, errorMessage] = useMemo(() => {
    if (!!value && fromAmount === null) return ["text-alert-error", t("Invalid amount")]
    if (!!fromAmount && fromBalance && fromAmount > fromBalance.transferable.planck)
      return ["text-alert-error", t("Insufficient balance")]
    return [undefined, undefined]
  }, [value, fromAmount, fromBalance, t])

  const formattedFiat = useMemo(
    () => (fiatValue ?? 0).toLocaleString(undefined, { currency, style: "currency" }),
    [fiatValue, currency]
  )

  const formattedTokenValue = useMemo(() => {
    if (!fromToken) return null
    if (!tokenDisplayValue) return `0 ${fromToken.symbol}`
    const num = Number(tokenDisplayValue)
    if (Number.isNaN(num)) return null
    return `${num.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${fromToken.symbol}`
  }, [tokenDisplayValue, fromToken])

  return (
    <div className="flex w-full flex-col overflow-hidden text-right">
      {editFiat ? (
        <input
          type="text"
          inputMode="decimal"
          id="swap-amount-input"
          autoComplete="off"
          disabled={!fromToken}
          className="w-full flex-1 bg-transparent text-right font-semibold text-[20px] text-white placeholder-grey-400"
          value={value}
          placeholder="0.00"
          onChange={handleChange}
        />
      ) : (
        <input
          type="text"
          inputMode="decimal"
          id="swap-amount-input"
          autoComplete="off"
          disabled={!fromToken}
          className="w-full bg-transparent text-right font-semibold text-[20px] text-white placeholder-grey-400"
          value={value}
          placeholder="0"
          onChange={handleChange}
        />
      )}
      {errorMessage ? (
        <div
          className={cn(
            "flex w-full items-center justify-end gap-2 overflow-hidden text-alert-error text-xs",
            errorClassName
          )}
        >
          <AlertCircleIcon className="size-6 shrink-0" />
          {errorMessage}
        </div>
      ) : (
        <div className="flex items-center justify-end gap-[4px]">
          {canEditFiat && (
            <button
              type="button"
              onClick={toggleEditMode}
              className="flex size-[16px] shrink-0 items-center justify-center rounded-full bg-white/5 backdrop-blur-[2px]"
            >
              <ArrowUpDownIcon className="size-[8px] text-body-secondary" />
            </button>
          )}
          <p className="truncate text-[12px] text-body-secondary leading-none">
            {editFiat ? formattedTokenValue : formattedFiat}
          </p>
        </div>
      )}
    </div>
  )
}

// TODO use this for token in and token out
const TokenAndAmountContainer: FC<{
  tokenButton: ReactNode
  tokenAmount: ReactNode
  accountButton: ReactNode
  accountBalance: ReactNode
  isError: boolean
}> = ({ tokenButton, tokenAmount, accountButton, accountBalance, isError }) => {
  return (
    <div
      className={cn(
        "relative flex w-full flex-col gap-8 overflow-hidden rounded bg-grey-900 px-6 py-8"
      )}
    >
      <div className="flex w-full items-center justify-between overflow-hidden">
        <div className="shrink-0">{tokenButton}</div>
        <div className="grow text-right">{tokenAmount}</div>
      </div>
      <div className="flex w-full items-center justify-between overflow-hidden">
        <div className="shrink-0">{accountButton}</div>
        <div className="grow text-right">{accountBalance}</div>
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
