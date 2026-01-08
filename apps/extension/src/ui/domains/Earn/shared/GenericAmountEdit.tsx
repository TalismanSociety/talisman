import { BalanceFormatter } from "@talismn/balances"
import { AlertCircleIcon, SwapIcon } from "@talismn/icons"
import { classNames, cn, tokensToPlanck } from "@talismn/util"
import {
  ChangeEventHandler,
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { PillButton } from "talisman-ui"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { useInputAutoWidth } from "@ui/hooks/useInputAutoWidth"
import { useSelectedCurrency, useTokenRatesFromUsd } from "@ui/state"

import { currencyConfig } from "../../Asset/currencyConfig"
import { Fiat } from "../../Asset/Fiat"
import { Tokens } from "../../Asset/Tokens"

const TokenInput: FC<{
  symbol: string
  decimals: number
  logo: string | null | undefined
  value: bigint | null
  onValueChanged: (value: bigint | null) => void
  onTokenClick?: () => void
}> = ({ symbol, decimals, logo, value, onValueChanged, onTokenClick }) => {
  const formatter = useMemo(
    () => (value !== null ? new BalanceFormatter(value, decimals) : null),
    [decimals, value],
  )

  const formattedValue = useMemo(() => formatter?.tokens ?? "", [formatter?.tokens])

  const [inputValue, setInputValue] = useState(formattedValue)
  const refSkipSync = useRef(false)

  useEffect(() => {
    if (refSkipSync.current) {
      refSkipSync.current = false
      return
    }
    setInputValue(formattedValue)
  }, [formattedValue])

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      refSkipSync.current = true
      const nextValue = e.target.value
      setInputValue(nextValue)

      if (!nextValue.trim()) return onValueChanged(null)

      try {
        const plancks = tokensToPlanck(nextValue, decimals)
        onValueChanged(BigInt(plancks))
      } catch (err) {
        // invalid input, ignore
        onValueChanged(null)
      }
    },
    [onValueChanged, decimals],
  )

  const refTokensInput = useRef<HTMLInputElement>(null)

  // auto focus if empty
  const refInitialized = useRef(false)
  useEffect(() => {
    if (refInitialized.current) return
    refInitialized.current = true
    if (value === null) refTokensInput.current?.focus()
  }, [refTokensInput, value])

  // resize input to keep content centered
  useInputAutoWidth(refTokensInput)

  return (
    <div className={"flex w-full max-w-[400px] flex-nowrap items-center justify-center gap-4"}>
      <input
        key="tokenInput"
        ref={refTokensInput}
        type="text"
        inputMode="decimal"
        placeholder="0"
        step="any"
        value={inputValue}
        className={"text-body peer inline-block w-fit min-w-0 text-ellipsis bg-transparent text-xl"}
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={onTokenClick}
        className={cn(
          "text-body flex shrink-0 items-center gap-2 text-base font-normal",
          onTokenClick ? "cursor-pointer" : "cursor-default",
        )}
      >
        <AssetLogo className="text-lg" url={logo} />
        <div>{symbol}</div>
      </button>
    </div>
  )
}

const FiatInput: FC<{
  decimals: number
  priceUsd: number | null
  value: bigint | null
  onValueChanged: (value: bigint | null) => void
}> = ({ decimals, priceUsd, value, onValueChanged }) => {
  const tokenRates = useTokenRatesFromUsd(priceUsd)
  const currency = useSelectedCurrency()

  const formatter = useMemo(
    () => (value === null ? null : new BalanceFormatter(value, decimals, tokenRates)),
    [decimals, tokenRates, value],
  )

  const formattedValue = useMemo(
    () => formatter?.fiat(currency)?.toString() ?? "",
    [currency, formatter],
  )

  const [inputValue, setInputValue] = useState(formattedValue)
  const refSkipSync = useRef(false)

  useEffect(() => {
    if (refSkipSync.current) {
      refSkipSync.current = false
      return
    }
    setInputValue(formattedValue)
  }, [formattedValue])

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      refSkipSync.current = true
      const nextValue = e.target.value
      setInputValue(nextValue)

      if (tokenRates?.[currency]?.price && nextValue) {
        try {
          const fiat = parseFloat(nextValue)
          const tokens = (fiat / tokenRates[currency].price).toFixed(Math.ceil(decimals))
          const plancks = tokensToPlanck(tokens, decimals)
          return onValueChanged(BigInt(plancks))
        } catch (err) {
          // invalid input, ignore
        }
      }

      return onValueChanged(null)
    },

    [tokenRates, currency, onValueChanged, decimals],
  )

  const refFiatInput = useRef<HTMLInputElement>(null)

  // auto focus if empty
  const refInitialized = useRef(false)
  useEffect(() => {
    if (refInitialized.current) return
    refInitialized.current = true
    if (value === null) refFiatInput.current?.focus()
  }, [value, refFiatInput])

  // resize input to keep content centered
  useInputAutoWidth(refFiatInput)

  if (!tokenRates) return null

  return (
    <div
      // display flex in reverse order to leverage peer css
      className="end flex w-full max-w-[400px] flex-row-reverse flex-nowrap items-center justify-center"
    >
      <input
        key="fiatInput"
        ref={refFiatInput}
        type="number"
        inputMode="decimal"
        value={inputValue}
        placeholder={"0.00"}
        className="text-body peer inline-block min-w-0 bg-transparent text-xl"
        onChange={handleChange}
      />
      <div className="block shrink-0">{currencyConfig[currency]?.symbol}</div>
    </div>
  )
}

const DisplayContainer: FC<PropsWithChildren> = ({ children }) => {
  return <div className="text-body-secondary max-w-[264px] truncate text-sm">{children}</div>
}

const FiatDisplay: FC<{ decimals: number; value: bigint | null; priceUsd: number | null }> = ({
  decimals,
  value,
  priceUsd,
}) => {
  const tokenRates = useTokenRatesFromUsd(priceUsd)
  const currency = useSelectedCurrency()
  const formatter = useMemo(
    () => (tokenRates ? new BalanceFormatter(value ?? 0n, decimals, tokenRates) : null),
    [tokenRates, value, decimals],
  )

  if (!formatter) return null

  return (
    <DisplayContainer>
      <Fiat amount={formatter.fiat(currency)} noCountUp />
    </DisplayContainer>
  )
}

const TokenDisplay: FC<{ symbol: string; decimals: number; value: bigint | null }> = ({
  symbol,
  decimals,
  value,
}) => {
  const formatter = useMemo(() => new BalanceFormatter(value ?? 0n, decimals), [decimals, value])

  if (!value) return null

  return (
    <DisplayContainer>
      <Tokens amount={formatter.tokens} decimals={decimals} symbol={symbol} noCountUp />
    </DisplayContainer>
  )
}

export type AmountEditErrorProps = {
  message: string
  details?: string
}

export const GenericAmountEdit: FC<{
  value: bigint | null
  decimals: number
  symbol: string
  logo: string | null | undefined
  priceUsd: number | null
  error?: string | null
  onValueChanged: (value: bigint | null) => void
  onMaxClick: () => void
  onTokenClick?: () => void
}> = ({
  decimals,
  symbol,
  logo,
  priceUsd,
  value,
  error,
  onValueChanged,
  onTokenClick,
  onMaxClick,
}) => {
  const { t } = useTranslation()
  const [isTokenEdit, setIsTokenEdit] = useState(true)

  const toggleIsTokenEdit = useCallback(() => {
    setIsTokenEdit((prev) => !prev)
  }, [])

  return (
    <div className="size-full">
      <div className="flex h-[50%] flex-col justify-end text-xl font-bold">
        {isTokenEdit || !priceUsd ? (
          <TokenInput
            decimals={decimals}
            symbol={symbol}
            logo={logo}
            value={value}
            onValueChanged={onValueChanged}
            onTokenClick={onTokenClick}
          />
        ) : (
          <FiatInput
            decimals={decimals}
            value={value}
            priceUsd={priceUsd}
            onValueChanged={onValueChanged}
          />
        )}
      </div>
      <div className={classNames("mt-4 flex max-w-full items-center justify-center gap-4")}>
        {priceUsd && (
          <>
            {!isTokenEdit ? (
              <TokenDisplay symbol={symbol} decimals={decimals} value={value} />
            ) : (
              <FiatDisplay decimals={decimals} value={value} priceUsd={priceUsd} />
            )}
            <PillButton
              onClick={toggleIsTokenEdit}
              size="xs"
              className="h-[2.2rem] w-[2.2rem] rounded-full !px-0 !py-0"
            >
              <SwapIcon />
            </PillButton>
          </>
        )}
        <PillButton
          onClick={onMaxClick}
          size="xs"
          className={classNames("h-[2.2rem] rounded-sm !px-4 !py-0")}
        >
          {t("Max")}
        </PillButton>
      </div>
      <div className={cn("text-brand-orange mt-4 text-center text-xs", !error && "invisible")}>
        <AlertCircleIcon className="inline-block align-text-top text-sm" /> {error}
      </div>
    </div>
  )
}
