import { AlertCircleIcon, ArrowUpDownIcon } from "@talismn/icons"
import { cn, isNotNil, planckToTokens, tokensToPlanck } from "@talismn/util"
import { useToken } from "@ui/state/chaindata"
import { useSelectedCurrency } from "@ui/state/settings"
import { useTokenRates } from "@ui/state/tokenRates"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSwap } from "../SwapProvider"

const INPUT_SYNC_DELAY = 300

type ParsedAmountState =
  | { kind: "empty" | "invalid" | "unavailable"; amount: null }
  | { kind: "valid"; amount: bigint }

const parseAmountInput = ({
  value,
  decimals,
  editFiat,
  tokenRate,
}: {
  value: string
  decimals: number | undefined
  editFiat: boolean
  tokenRate: number | undefined
}): ParsedAmountState => {
  if (!value || decimals === undefined) return { kind: "empty", amount: null }

  if (editFiat) {
    if (!tokenRate) return { kind: "unavailable", amount: null }

    try {
      const fiatAmount = Number.parseFloat(value)
      if (Number.isNaN(fiatAmount)) return { kind: "invalid", amount: null }

      const tokens = (fiatAmount / tokenRate).toFixed(Math.ceil(decimals / 3))
      const planck = tokensToPlanck(tokens, decimals)

      return isNotNil(planck)
        ? { kind: "valid", amount: BigInt(planck) }
        : { kind: "invalid", amount: null }
    } catch {
      return { kind: "invalid", amount: null }
    }
  }

  try {
    const amount = tokensToPlanck(value === "0." ? "0" : value, decimals)
    return isNotNil(amount)
      ? { kind: "valid", amount: BigInt(amount) }
      : { kind: "invalid", amount: null }
  } catch {
    return { kind: "invalid", amount: null }
  }
}

export const InputFromAmount = () => {
  const currency = useSelectedCurrency()
  const { t } = useTranslation()

  const { fromBalance, fromTokenId, fromAmount, setFromAmount } = useSwap()

  const fromToken = useToken(fromTokenId ?? undefined)
  const tokenRates = useTokenRates(fromTokenId)

  const canEditFiat = useMemo(() => !!tokenRates?.[currency]?.price, [tokenRates, currency])

  const [editFiat, setEditFiat] = useState(false)
  const [value, setValue] = useState(() => {
    if (fromAmount === null || !fromToken) return ""
    return planckToTokens(fromAmount.toString(), fromToken.decimals) ?? ""
  })
  const refSkipSync = useRef(false)
  const refValue = useRef(value)
  refValue.current = value
  const tokenRate = tokenRates?.[currency]?.price

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

  const parsedAmount = useMemo(
    () =>
      parseAmountInput({
        value,
        decimals: fromToken?.decimals,
        editFiat,
        tokenRate,
      }),
    [editFiat, fromToken?.decimals, tokenRate, value]
  )

  // Keep input text in sync when amount is changed externally (e.g. Max/reverse).
  useEffect(() => {
    const decimals = fromToken?.decimals
    if (decimals === undefined) {
      setValue((prev) => {
        if (prev === "") return prev
        refSkipSync.current = true
        return ""
      })
      return
    }

    // If the current input already parses to the same amount, don't overwrite.
    // This prevents reformatting while the user is typing (e.g. "0.00" → "0").
    const currentParsed = parseAmountInput({
      value: refValue.current,
      decimals,
      editFiat,
      tokenRate,
    })
    if (currentParsed.amount === fromAmount) return

    const tokenValue =
      fromAmount === null ? "" : (planckToTokens(fromAmount.toString(), decimals) ?? "")

    if (editFiat) {
      if (!tokenRate) return

      const tokenAmount = Number.parseFloat(tokenValue || "0")
      if (!Number.isFinite(tokenAmount)) return

      const nextFiatValue = fromAmount === null ? "" : (tokenAmount * tokenRate).toFixed(2)

      setValue((prev) => {
        if (prev === nextFiatValue) return prev
        refSkipSync.current = true
        return nextFiatValue
      })
      return
    }

    setValue((prev) => {
      if (prev === tokenValue) return prev
      refSkipSync.current = true
      return tokenValue
    })
  }, [editFiat, fromAmount, fromToken?.decimals, tokenRate])

  // Sync fromAmount with input value after typing settles so quote queries do not refire per keystroke.
  useEffect(() => {
    if (refSkipSync.current) {
      refSkipSync.current = false
      return
    }

    if (parsedAmount.kind !== "valid") {
      setFromAmount(null)
      return
    }

    const timeout = setTimeout(() => setFromAmount(parsedAmount.amount), INPUT_SYNC_DELAY)

    return () => clearTimeout(timeout)
  }, [parsedAmount, setFromAmount])

  const previewFromAmount = parsedAmount.kind === "valid" ? parsedAmount.amount : null

  // Fiat value for display (token mode) and toggle conversion
  const fiatValue = useMemo(() => {
    if (!previewFromAmount || !fromToken || !tokenRates) return null
    const rate = tokenRates[currency]?.price
    if (!rate) return null
    const tokenAmount = Number(
      planckToTokens(previewFromAmount.toString(), fromToken.decimals) ?? "0"
    )
    return tokenAmount * rate
  }, [previewFromAmount, fromToken, tokenRates, currency])

  // Token display string for fiat mode second row
  const tokenDisplayValue = useMemo(
    () =>
      previewFromAmount && fromToken
        ? planckToTokens(previewFromAmount.toString(), fromToken.decimals)
        : null,
    [previewFromAmount, fromToken]
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
    if (!!value && parsedAmount.kind === "invalid") return ["text-alert-error", t("Invalid amount")]
    if (
      parsedAmount.kind === "valid" &&
      fromBalance &&
      parsedAmount.amount > fromBalance.transferable.planck
    )
      return ["text-alert-error", t("Insufficient balance")]
    return [undefined, undefined]
  }, [value, parsedAmount, fromBalance, t])

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
              className="flex size-[16px] shrink-0 items-center justify-center rounded-full bg-grey-800 text-body-secondary hover:bg-grey-750 hover:text-body"
            >
              <ArrowUpDownIcon className="size-[8px]" />
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
