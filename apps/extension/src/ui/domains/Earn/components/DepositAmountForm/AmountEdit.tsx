import { AlertCircleIcon, SwapIcon } from "@talismn/icons"
import { classNames, tokensToPlanck } from "@talismn/util"
import BigNumber from "bignumber.js"
import { log } from "extension-shared"
import debounce from "lodash-es/debounce"
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

import { WithTooltip } from "@talisman/components/Tooltip"
import { currencyConfig } from "@ui/domains/Asset/currencyConfig"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useInputAutoWidth } from "@ui/hooks/useInputAutoWidth"
import { useSelectedCurrency } from "@ui/state"

import { useDepositWizard } from "../../context/DepositWizardContext"
import { useDepositFunds } from "../useDepositFunds"
import { TokenPillButton } from "./TokenPillButton"

const normalizeStringNumber = (value?: string | number | null, decimals = 18) => {
  try {
    return value ? BigNumber(Number(value).toFixed(decimals)).toString(10) : ""
  } catch (err) {
    log.error("normalizeStringNumber", { value, decimals, err })
    return ""
  }
}

const TokenInput = ({ inputRef }: { inputRef?: React.RefObject<HTMLInputElement> }) => {
  const { set, remove } = useDepositWizard()
  const { token, tokenId, deposit, maxAmount, isEstimatingMaxAmount, depositMax, amount } =
    useDepositFunds()

  const refTokensInput = useRef<HTMLInputElement>(null)
  const finalRef = inputRef || refTokensInput
  useInputAutoWidth(finalRef)

  useEffect(() => {
    if (depositMax && finalRef.current && maxAmount?.tokens) {
      const expectedInputValue = normalizeStringNumber(maxAmount.tokens, token?.decimals)
      if (finalRef.current.value !== expectedInputValue) finalRef.current.value = expectedInputValue
    }
  }, [amount, depositMax, token, maxAmount, finalRef])

  const defaultValue = useMemo(
    () =>
      normalizeStringNumber(
        depositMax && maxAmount ? maxAmount.tokens : deposit?.tokens,
        token?.decimals,
      ),
    [maxAmount, depositMax, token?.decimals, deposit?.tokens],
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    debounce((e) => {
      if (depositMax) set("depositMax", false)

      const text = e.target.value ?? ""
      const num = Number(text)

      if (token && text.length && !isNaN(num)) set("amount", tokensToPlanck(text, token.decimals))
      else remove("amount")
    }, 250),
    [remove, depositMax, set, token],
  )

  const refInitialized = useRef(false)
  useEffect(() => {
    if (refInitialized.current) return
    refInitialized.current = true
    if (!depositMax && !deposit) finalRef.current?.focus()
  }, [finalRef, depositMax, deposit])

  return (
    <div
      className={classNames(
        "flex w-full max-w-[400px] flex-nowrap items-center justify-center gap-4",
        isEstimatingMaxAmount && "animate-pulse",
      )}
    >
      {isEstimatingMaxAmount && <div className="bg-grey-800 h-16 w-48 rounded"></div>}
      <input
        key="tokenInput"
        ref={finalRef}
        type="text"
        inputMode="decimal"
        defaultValue={defaultValue}
        placeholder="0"
        className={classNames(
          "text-body peer inline-block min-w-0 text-ellipsis bg-transparent text-xl",
          depositMax && "placeholder:text-white",
          isEstimatingMaxAmount && "hidden",
        )}
        onChange={handleChange}
      />
      <TokenPillButton tokenId={tokenId} onClick={() => {}} />
    </div>
  )
}

const FiatInput = ({ inputRef }: { inputRef?: React.RefObject<HTMLInputElement> }) => {
  const { set, remove, depositMax } = useDepositWizard()
  const { token, deposit, maxAmount, tokenRates, isEstimatingMaxAmount } = useDepositFunds()

  const refFiatInput = useRef<HTMLInputElement>(null)
  const finalRef = inputRef || refFiatInput
  useInputAutoWidth(finalRef)
  const currency = useSelectedCurrency()

  useEffect(() => {
    if (depositMax && finalRef.current && typeof maxAmount?.fiat(currency) === "number") {
      const expectedInputValue = maxAmount?.fiat(currency)?.toString() ?? ""
      if (finalRef.current.value !== expectedInputValue) finalRef.current.value = expectedInputValue
    }
  }, [depositMax, currency, maxAmount, finalRef])

  const defaultValue = useMemo(
    () =>
      normalizeStringNumber(
        depositMax && maxAmount ? maxAmount.fiat(currency) : deposit?.fiat(currency),
        2,
      ),
    [currency, maxAmount, depositMax, deposit],
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    debounce((e) => {
      if (depositMax) set("depositMax", false)

      const text = e.target.value ?? ""
      const num = Number(text)
      const tokenRate = tokenRates?.[currency]

      if (token && tokenRate && text.length && !isNaN(num)) {
        const fiat = parseFloat(text)
        const tokens = (fiat / tokenRate.price).toFixed(Math.ceil(token.decimals / 3))
        set("amount", tokensToPlanck(tokens, token.decimals))
      } else remove("amount")
    }, 250),
    [remove, depositMax, set, token, tokenRates],
  )

  if (!tokenRates) return null

  return (
    <div
      className={classNames(
        "end flex w-full max-w-[400px] flex-row-reverse flex-nowrap items-center justify-center",
        isEstimatingMaxAmount && "animate-pulse",
      )}
    >
      <input
        key="fiatInput"
        ref={finalRef}
        type="text"
        defaultValue={defaultValue}
        placeholder={"0.00"}
        className={classNames(
          "text-body peer inline-block min-w-0 bg-transparent text-xl",
          isEstimatingMaxAmount && "hidden",
        )}
        onChange={handleChange}
      />
      {isEstimatingMaxAmount && <div className="bg-grey-800 h-16 w-48 rounded"></div>}
      <div
        className={classNames(
          "block shrink-0",
          isEstimatingMaxAmount ? "text-grey-800" : "peer-placeholder-shown:text-body-disabled",
        )}
      >
        {currencyConfig[currency]?.symbol}
      </div>
    </div>
  )
}

const DisplayContainer: FC<PropsWithChildren> = ({ children }) => {
  return <div className="text-body-secondary max-w-[264px] truncate text-sm">{children}</div>
}

const FiatDisplay = () => {
  const { tokenRates, deposit, maxAmount, depositMax } = useDepositFunds()

  const value = depositMax ? maxAmount : deposit

  if (!tokenRates || !value) return null

  return (
    <DisplayContainer>
      <Fiat amount={value} noCountUp />
    </DisplayContainer>
  )
}

const TokenDisplay = () => {
  const { token, deposit, maxAmount, depositMax } = useDepositFunds()

  const value = depositMax ? maxAmount : deposit

  if (!token || !value) return null

  return (
    <DisplayContainer>
      <Tokens
        amount={value.tokens ?? "0"}
        decimals={token.decimals}
        symbol={token.symbol}
        noCountUp
      />
    </DisplayContainer>
  )
}

export const DepositAmountErrorMessage = () => {
  const { error } = useDepositFunds()

  return error ? (
    <WithTooltip tooltip={typeof error === "string" ? error : error.message}>
      <div className="text-alert-error flex items-center justify-center gap-2 !text-xs font-normal">
        <AlertCircleIcon className="text-alert-error inline-block align-text-top text-xs" />
        {typeof error === "string" ? error : error.message}
      </div>
    </WithTooltip>
  ) : null
}

export const AmountEdit = () => {
  const { t } = useTranslation()
  const [isTokenEdit, setIsTokenEdit] = useState(true)
  const { tokenRates, isEstimatingMaxAmount, maxAmount, token } = useDepositFunds()
  const { set } = useDepositWizard()
  const currency = useSelectedCurrency()

  const tokenInputRef = useRef<HTMLInputElement | null>(null)
  const fiatInputRef = useRef<HTMLInputElement | null>(null)

  const toggleIsTokenEdit = useCallback(() => {
    setIsTokenEdit((prev) => !prev)
  }, [])

  const handleMaxClick = useCallback(() => {
    if (isTokenEdit) {
      if (tokenInputRef.current && token && maxAmount?.tokens) {
        tokenInputRef.current.value = maxAmount.tokens
        // Directly update context for immediate fee estimation
        set("amount", maxAmount.planck.toString())
        // Trigger onChange so input handler runs
        const event = new Event("input", { bubbles: true })
        tokenInputRef.current.dispatchEvent(event)
      }
    } else {
      if (fiatInputRef.current && token && tokenRates && maxAmount) {
        const fiatValue = maxAmount.fiat(currency)
        if (fiatValue !== null) {
          fiatInputRef.current.value = fiatValue.toString()
          // Directly update context for immediate fee estimation
          set("amount", maxAmount.planck.toString())
          // Trigger onChange so input handler runs
          const event = new Event("input", { bubbles: true })
          fiatInputRef.current.dispatchEvent(event)
        }
      }
    }
  }, [isTokenEdit, token, tokenRates, currency, maxAmount, set])

  return (
    <div className="w-full grow">
      {!!token && (
        <>
          <div className="flex h-[8rem] flex-col justify-end text-xl font-bold">
            {isTokenEdit ? (
              <TokenInput inputRef={tokenInputRef} />
            ) : (
              <FiatInput inputRef={fiatInputRef} />
            )}
          </div>
          <div
            className={classNames(
              "mt-4 flex max-w-full items-center justify-center gap-4",
              isEstimatingMaxAmount && "invisible",
            )}
          >
            {tokenRates && (
              <>
                {!isTokenEdit ? <TokenDisplay /> : <FiatDisplay />}
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
              onClick={handleMaxClick}
              disabled={!maxAmount}
              size="xs"
              className={classNames("h-[2.2rem] rounded-sm !px-4 !py-0")}
            >
              {t("Max")}
            </PillButton>
          </div>
          {/* Error message moved to parent form for single source of truth */}
        </>
      )}
    </div>
  )
}
