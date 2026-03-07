import { BalanceFormatter } from "@talismn/balances"
import type { Token } from "@talismn/chaindata-provider"
import { AlertCircleIcon, SwapIcon } from "@talismn/icons"
import type { TokenRates } from "@talismn/token-rates"
import { classNames, cn, tokensToPlanck } from "@talismn/util"
import { PillButton } from "@ui/components/PillButton"
import { TokenDisplaySymbol } from "@ui/domains/Asset/TokenDisplaySymbol"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { useInputAutoWidth } from "@ui/hooks/useInputAutoWidth"
import { useToken } from "@ui/state/chaindata"
import { useSelectedCurrency } from "@ui/state/settings"
import { useTokenRates } from "@ui/state/tokenRates"
import {
  type ChangeEventHandler,
  type FC,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"

import { currencyConfig } from "../../Asset/currencyConfig"
import { Fiat } from "../../Asset/Fiat"
import { Tokens } from "../../Asset/Tokens"

const TokenInput: FC<{
  token: Token
  value: bigint | null
  onValueChanged: (value: bigint | null) => void
  onTokenClick?: () => void
}> = ({ token, value, onValueChanged, onTokenClick }) => {
  const formatter = useMemo(
    () => (value !== null ? new BalanceFormatter(value, token.decimals) : null),
    [token.decimals, value]
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

      if (!token || !nextValue.trim()) return onValueChanged(null)

      try {
        const plancks = tokensToPlanck(nextValue, token.decimals)
        onValueChanged(BigInt(plancks))
      } catch {
        // invalid input, ignore
        onValueChanged(null)
      }
    },
    [onValueChanged, token]
  )

  const refTokensInput = useRef<HTMLInputElement>(null)

  // auto focus if empty
  const refInitialized = useRef(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
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
        className={"peer inline-block w-fit min-w-0 text-ellipsis bg-transparent text-body text-xl"}
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={onTokenClick}
        className={cn(
          "flex shrink-0 items-center gap-2 font-normal text-base text-body",
          onTokenClick ? "cursor-pointer" : "cursor-default"
        )}
      >
        <TokenLogo className="text-lg" tokenId={token.id} />
        <div>
          <TokenDisplaySymbol tokenId={token.id} />
        </div>
      </button>
    </div>
  )
}

const FiatInput: FC<{
  token: Token
  value: bigint | null
  tokenRates: TokenRates
  onValueChanged: (value: bigint | null) => void
}> = ({ token, value, tokenRates, onValueChanged }) => {
  const currency = useSelectedCurrency()

  const formatter = useMemo(
    () => (value === null ? null : new BalanceFormatter(value, token.decimals, tokenRates)),
    [token.decimals, tokenRates, value]
  )

  const formattedValue = useMemo(
    () => formatter?.fiat(currency)?.toString() ?? "",
    [currency, formatter]
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

      if (token && tokenRates?.[currency]?.price && nextValue) {
        try {
          const fiat = parseFloat(nextValue)
          const tokens = (fiat / tokenRates[currency].price).toFixed(Math.ceil(token.decimals))
          const plancks = tokensToPlanck(tokens, token.decimals)
          return onValueChanged(BigInt(plancks))
        } catch {
          // invalid input, ignore
        }
      }

      return onValueChanged(null)
    },

    [token, tokenRates, currency, onValueChanged]
  )

  const refFiatInput = useRef<HTMLInputElement>(null)

  // auto focus if empty
  const refInitialized = useRef(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
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
        className="peer inline-block min-w-0 bg-transparent text-body text-xl"
        onChange={handleChange}
      />
      <div className="block shrink-0">{currencyConfig[currency]?.symbol}</div>
    </div>
  )
}

const DisplayContainer: FC<PropsWithChildren> = ({ children }) => {
  return <div className="max-w-[264px] truncate text-body-secondary text-sm">{children}</div>
}

const FiatDisplay: FC<{ token: Token; value: bigint | null; tokenRates: TokenRates | null }> = ({
  token,
  value,
  tokenRates,
}) => {
  const currency = useSelectedCurrency()
  const formatter = useMemo(
    () => (tokenRates ? new BalanceFormatter(value ?? 0n, token.decimals, tokenRates) : null),
    [token.decimals, value, tokenRates]
  )

  if (!formatter) return null

  return (
    <DisplayContainer>
      <Fiat amount={formatter.fiat(currency)} noCountUp />
    </DisplayContainer>
  )
}

const TokenDisplay: FC<{ token: Token; value: bigint | null }> = ({ token, value }) => {
  const formatter = useMemo(
    () => new BalanceFormatter(value ?? 0n, token.decimals),
    [token.decimals, value]
  )

  if (!token || !value) return null

  return (
    <DisplayContainer>
      <Tokens amount={formatter.tokens} decimals={token.decimals} symbol={token.symbol} noCountUp />
    </DisplayContainer>
  )
}

export type AmountEditErrorProps = {
  message: string
  details?: string
}

export const AmountEdit: FC<{
  value: bigint | null
  tokenId: string
  error?: string | null
  onValueChanged: (value: bigint | null) => void
  onMaxClick: () => void
  onTokenClick?: () => void
}> = ({ tokenId, value, error, onValueChanged, onTokenClick, onMaxClick }) => {
  const { t } = useTranslation()
  const token = useToken(tokenId)
  const tokenRates = useTokenRates(tokenId)
  const [isTokenEdit, setIsTokenEdit] = useState(true)

  const toggleIsTokenEdit = useCallback(() => {
    setIsTokenEdit((prev) => !prev)
  }, [])

  if (!token) return null

  return (
    <div className="size-full">
      <div className="flex h-[50%] flex-col justify-end font-bold text-xl">
        {isTokenEdit || !tokenRates ? (
          <TokenInput
            token={token}
            value={value}
            onValueChanged={onValueChanged}
            onTokenClick={onTokenClick}
          />
        ) : (
          <FiatInput
            token={token}
            value={value}
            tokenRates={tokenRates}
            onValueChanged={onValueChanged}
          />
        )}
      </div>
      <div className={classNames("mt-4 flex max-w-full items-center justify-center gap-4")}>
        {tokenRates && (
          <>
            {!isTokenEdit ? (
              <TokenDisplay token={token} value={value} />
            ) : (
              <FiatDisplay token={token} value={value} tokenRates={tokenRates} />
            )}
            <PillButton
              onClick={toggleIsTokenEdit}
              size="xs"
              className="!px-0 !py-0 h-[2.2rem] w-[2.2rem] rounded-full"
            >
              <SwapIcon />
            </PillButton>
          </>
        )}
        <PillButton
          onClick={onMaxClick}
          size="xs"
          className={classNames("!px-4 !py-0 h-[2.2rem] rounded-sm")}
        >
          {t("Max")}
        </PillButton>
      </div>
      <div className={cn("mt-4 text-center text-brand-orange text-xs", !error && "invisible")}>
        <AlertCircleIcon className="inline-block align-text-top text-sm" /> {error}
      </div>
    </div>
  )
}
