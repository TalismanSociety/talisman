import { AlertCircleIcon, ArrowUpDownIcon } from "@talismn/icons"
import { cn, isNotNil, planckToTokens, tokensToPlanck } from "@talismn/util"
import { useToken } from "@ui/state/chaindata"
import { useSelectedCurrency } from "@ui/state/settings"
import { useTokenRates } from "@ui/state/tokenRates"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSwap } from "../SwapProvider"

export const InputFromAmount = () => {
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
          aria-label={t("Amount to swap")}
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
          aria-label={t("Amount to swap")}
          disabled={!fromToken}
          className="w-full bg-transparent text-right font-semibold text-[20px] text-white placeholder-grey-400"
          value={value}
          placeholder="0"
          onChange={handleChange}
        />
      )}
      {errorMessage ? (
        <div
          role="alert"
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
          <p className="truncate text-[12px] text-body-inactive leading-none">
            {editFiat ? formattedTokenValue : formattedFiat}
          </p>
        </div>
      )}
    </div>
  )
}
