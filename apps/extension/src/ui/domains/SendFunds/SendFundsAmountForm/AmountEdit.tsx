import { log } from "@extension/shared"
import { WithTooltip } from "@talisman/components/Tooltip"
import { AlertCircleIcon, SwapIcon } from "@talismn/icons"
import { classNames, tokensToPlanck } from "@talismn/util"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import BigNumber from "bignumber.js"
import debounce from "lodash/debounce"
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

import { currencyConfig } from "../../Asset/currencyConfig"
import { Fiat } from "../../Asset/Fiat"
import Tokens from "../../Asset/Tokens"
import { useSendFunds } from "../useSendFunds"
import { TokenPillButton } from "./TokenPillButton"

const normalizeStringNumber = (value?: string | number | null, decimals = 18) => {
  try {
    // fixes the decimals and remove all leading/trailing zeros
    // NOTE: BigNumber is used to correctly format the string for tiny numbers.
    // `Number(0.000000123).toString()` becomes `1.23e-7`
    // `BigNumber(0.000000123).toString(10)` becomes `0.000000123`
    return value ? BigNumber(Number(value).toFixed(decimals)).toString(10) : ""
  } catch (err) {
    log.error("normalizeStringNumber", { value, decimals, err })
    return ""
  }
}

const TokenInput = ({ onTokenClick }: { onTokenClick: () => void }) => {
  const { set, remove } = useSendFundsWizard()
  const {
    tokenId,
    token,
    transfer,
    maxAmount,
    isEstimatingMaxAmount,
    sendMax,
    refTokensInput,
    resizeTokensInput,
  } = useSendFunds()

  const defaultValue = useMemo(
    () =>
      normalizeStringNumber(
        sendMax && maxAmount ? maxAmount.tokens : transfer?.tokens,
        token?.decimals
      ),
    [maxAmount, sendMax, token?.decimals, transfer?.tokens]
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    debounce((e) => {
      if (sendMax) set("sendMax", false)

      const text = e.target.value ?? ""
      const num = Number(text)

      if (token && text.length && !isNaN(num)) set("amount", tokensToPlanck(text, token.decimals))
      else remove("amount")
    }, 250),
    [remove, sendMax, set, token]
  )

  const refInitialized = useRef(false)
  useEffect(() => {
    if (refInitialized.current) return
    refInitialized.current = true
    if (!sendMax && !transfer) refTokensInput.current?.focus()
  }, [refTokensInput, sendMax, transfer])

  useEffect(() => {
    resizeTokensInput()
  }, [resizeTokensInput, token?.symbol])

  return (
    <div
      className={classNames(
        "flex w-full max-w-[400px] flex-nowrap items-center justify-center gap-4",
        isEstimatingMaxAmount && "animate-pulse"
      )}
    >
      {isEstimatingMaxAmount && <div className="bg-grey-800 h-16 w-48 rounded"></div>}
      <input
        key="tokenInput"
        ref={refTokensInput}
        type="text"
        inputMode="decimal"
        defaultValue={defaultValue}
        placeholder="0"
        className={classNames(
          "text-body peer inline-block min-w-0 text-ellipsis bg-transparent text-xl",
          sendMax && "placeholder:text-white",
          isEstimatingMaxAmount && "hidden" // hide until value is known
        )}
        onChange={handleChange}
      />
      <TokenPillButton tokenId={tokenId} onClick={onTokenClick} />
    </div>
  )
}

const FiatInput = () => {
  const { set, remove, sendMax } = useSendFundsWizard()
  const {
    token,
    transfer,
    maxAmount,
    tokenRates,
    isEstimatingMaxAmount,
    refFiatInput,
    resizeFiatInput,
  } = useSendFunds()

  const currency = useSelectedCurrency()

  const defaultValue = useMemo(
    () =>
      normalizeStringNumber(
        sendMax && maxAmount ? maxAmount.fiat(currency) : transfer?.fiat(currency),
        2
      ),
    [currency, maxAmount, sendMax, transfer]
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    debounce((e) => {
      if (sendMax) set("sendMax", false)

      const text = e.target.value ?? ""
      const num = Number(text)
      const tokenRate = tokenRates?.[currency]

      if (token && tokenRate && text.length && !isNaN(num)) {
        const fiat = parseFloat(text)
        const tokens = (fiat / tokenRate).toFixed(Math.ceil(token.decimals / 3))
        set("amount", tokensToPlanck(tokens, token.decimals))
      } else remove("amount")
    }, 250),
    [remove, sendMax, set, token, tokenRates]
  )

  useEffect(() => {
    resizeFiatInput()
  }, [resizeFiatInput])

  if (!tokenRates) return null

  return (
    <div
      className={classNames(
        // display flex in reverse order to leverage peer css
        "end flex w-full max-w-[400px] flex-row-reverse flex-nowrap items-center justify-center",
        isEstimatingMaxAmount && "animate-pulse"
      )}
    >
      <input
        key="fiatInput"
        ref={refFiatInput}
        type="text"
        defaultValue={defaultValue}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={!sendMax && !transfer}
        placeholder={"0.00"}
        className={classNames(
          "text-body peer inline-block min-w-0 bg-transparent text-xl",
          isEstimatingMaxAmount && "hidden" // hide until value is known
        )}
        onChange={handleChange}
      />
      {isEstimatingMaxAmount && <div className="bg-grey-800 h-16 w-48 rounded"></div>}
      <div
        className={classNames(
          "block shrink-0",
          isEstimatingMaxAmount ? "text-grey-800" : "peer-placeholder-shown:text-body-disabled"
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
  const { tokenRates, transfer, maxAmount, sendMax } = useSendFunds()

  const value = sendMax ? maxAmount : transfer

  if (!tokenRates || !value) return null

  return (
    <DisplayContainer>
      <Fiat amount={value} noCountUp />
    </DisplayContainer>
  )
}

const TokenDisplay = () => {
  const { token, transfer, maxAmount, sendMax } = useSendFunds()

  const value = sendMax ? maxAmount : transfer

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

const ErrorMessage = () => {
  const { error, errorDetails } = useSendFunds()

  return error ? (
    <WithTooltip tooltip={errorDetails}>
      <AlertCircleIcon className="inline-block align-text-top text-sm" /> {error}
    </WithTooltip>
  ) : null
}

export const AmountEdit = ({ onTokenClick }: { onTokenClick: () => void }) => {
  const { t } = useTranslation("send-funds")
  const [isTokenEdit, setIsTokenEdit] = useState(true)
  const { onSendMaxClick, tokenRates, isEstimatingMaxAmount, maxAmount, token } = useSendFunds()

  const toggleIsTokenEdit = useCallback(() => {
    setIsTokenEdit((prev) => !prev)
  }, [])

  return (
    <div className="w-full grow">
      {!!token && (
        <>
          <div className="flex h-[12rem] flex-col justify-end text-xl font-bold">
            {isTokenEdit ? <TokenInput onTokenClick={onTokenClick} /> : <FiatInput />}
          </div>
          <div
            className={classNames(
              "mt-4 flex max-w-full items-center justify-center gap-4",
              isEstimatingMaxAmount && "invisible"
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
              onClick={onSendMaxClick}
              disabled={!maxAmount}
              size="xs"
              className={classNames("h-[2.2rem] rounded-sm !px-4 !py-0")}
            >
              {t("Max")}
            </PillButton>
          </div>
          <div className="text-brand-orange mt-4 text-center text-xs">
            <ErrorMessage />
          </div>
        </>
      )}
    </div>
  )
}
