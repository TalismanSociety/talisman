/* eslint-disable react/no-children-prop */
import { TokenId } from "@talismn/chaindata-provider"
import { ExternalLinkIcon } from "@talismn/icons"
import { TokenRatesList } from "@talismn/token-rates"
import { classNames, formatPrice, planckToTokens } from "@talismn/util"
import { useField, useForm, useStore } from "@tanstack/react-form"
import { UseQueryResult } from "@tanstack/react-query"
import { BalanceFormatter } from "extension-core"
import { FC, ReactNode, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"
import { z } from "zod"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { useSpecificTokenRates } from "@ui/hooks/useSpecificTokenRates"
import { useSelectedCurrency, useToken } from "@ui/state"

import { Fiat } from "../Fiat"
import Tokens from "../Tokens"
import { RampProvider } from "./coinbase/types"
import { RampCurrencyPickerButton } from "./RampCurrencyPickerButton"
import { RampTokenPickerButton } from "./RampTokenPickerButton"
import { useRampBuyCurrencies } from "./useRampBuyCurrencies"
import { BuyQuote, BuyQuoteConfig, RampBuyQuotes, useRampBuyQuotes } from "./useRampBuyQuotes"
import { useRampBuyTokens } from "./useRampBuyTokens"

const schema = z.object({
  currencyCode: z.string().nonempty(),
  tokenId: z.string().nonempty(),
  amount: z.number().gt(0),
})

type BuyFormData = {
  currencyCode?: string
  tokenId?: TokenId
  amount?: number
  provider?: RampProvider
  account?: string
}

// TODO clear it up
const DEFAULT_FORM_DATA: BuyFormData = {
  // currencyCode: "BOB",
  // tokenId: "1-evm-native",
  // amount: 100,
}

// export const { fieldContext, formContext, useFieldContext } = createFormHookContexts()

// const { useAppForm: useRampBuyForm } = createFormHook({
//   fieldContext,
//   formContext,
//   // We'll learn more about these options later
//   fieldComponents: {},
//   formComponents: {},
// })

export const RampBuyForm = () => {
  const { t } = useTranslation()
  const form = useForm({
    defaultValues: DEFAULT_FORM_DATA,
    onSubmit: ({ value }) => {
      // eslint-disable-next-line no-console
      console.log(value)
    },
    validators: {
      onMount: schema,
      onChange: schema,
    },
  })

  const { currencies } = useRampBuyCurrencies()

  const formData = useStore(form.store, (state) => state.values)

  const { tokens } = useRampBuyTokens(formData.currencyCode)
  const { data: tokenRates, isLoading: isLoadingTokenRates } = useSpecificTokenRates(tokens)

  const quoteConfig = useStore(form.store, (state) => {
    const { currencyCode, amount, tokenId } = state.values
    return tokenId && amount && currencyCode ? { currencyCode, amount, tokenId } : null
  })

  // const quoteConfig = useMemo<BuyQuoteConfig | null>(() => {
  //   const { currencyCode, amount, tokenId } = formData
  //   return tokenId && amount && currencyCode ? { currencyCode, amount, tokenId } : null
  // }, [formData])

  const quotes = useRampBuyQuotes(quoteConfig)
  // const token = useToken(formData.tokenId)
  // const price = useMemo(
  //   () => (token ? new BalanceFormatter("1", token.decimals, tokenRates?.[token.id]) : null),
  //   [token, tokenRates],
  // )

  // const tokenId = useStore(form.store, (state) => state.values.tokenId)
  // const token = useToken(tokenId)

  useEffect(() => {
    form.resetField("provider")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteConfig?.tokenId, formData.currencyCode])

  const providerField = useField({
    form,
    name: "provider",
  })
  useEffect(() => {
    if (!providerField.state.value && !quotes.coinbase.isLoading && !quotes.ramp.isLoading) {
      if (quotes.coinbase.data?.amountOut && quotes.ramp.data?.amountOut)
        providerField.setValue(
          quotes.coinbase.data.amountOut > quotes.ramp.data.amountOut ? "coinbase" : "ramp",
        )
      if (quotes.coinbase.data?.amountOut) providerField.setValue("coinbase")
      if (quotes.ramp.data?.amountOut) providerField.setValue("ramp")
    }
    // if(!formData.!quotes.coinbase.isLoading || !quotes.ramp.isLoading) {
    //   setIsBuyForm(false)
    // }
  }, [
    providerField,
    quotes.coinbase.data,
    quotes.coinbase.isLoading,
    quotes.ramp.data,
    quotes.ramp.isLoading,
  ])

  return (
    <form
      className="text-body-secondary flex size-full flex-col overflow-hidden"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <ScrollContainer className="w-full grow">
        <div className="flex size-full shrink-0 flex-col gap-6 px-10">
          <div className="bg-grey-900 space-y-6 rounded border-0 p-6">
            <div className="text-body leading-paragraph text-sm">{t("Select Assets")}</div>
            <div className="space-y-4">
              <div className="leading-paragraph text-xs">{t("You Pay")}</div>
              <RampNumberFieldContainer
                input={
                  <form.Field
                    name="amount"
                    children={(field) => (
                      <input
                        type="number"
                        className="text-md peer w-[15rem] min-w-0 appearance-none border-none bg-transparent font-bold leading-none text-white md:max-w-fit"
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(
                            isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber,
                          )
                        }
                      />
                    )}
                  />
                }
                button={
                  <form.Field
                    name="currencyCode"
                    children={(field) => (
                      <RampCurrencyPickerButton
                        currencies={currencies}
                        onSelect={(currency) => field.handleChange(currency)}
                        value={field.state.value}
                      />
                    )}
                  />
                }
              />
            </div>
            <div className="space-y-4">
              <div className="flex w-full justify-between">
                <div className="leading-paragraph text-xs">{t("You're receiving (estimate)")}</div>
                <div className="leading-paragraph text-xs">
                  <TokenPrice
                    tokenId={quoteConfig?.tokenId}
                    tokenRates={tokenRates}
                    isLoading={isLoadingTokenRates}
                  />
                </div>
              </div>
              <RampNumberFieldContainer
                input={
                  <form.Field
                    name="provider"
                    children={(field) => (
                      <div className="text-md text-body w-full overflow-hidden truncate pl-2 font-bold">
                        <AmountOut
                          provider={field.state.value}
                          quotes={quotes}
                          tokenId={quoteConfig?.tokenId}
                        />
                      </div>
                    )}
                  />
                }
                button={
                  <form.Field
                    name="tokenId"
                    children={(field) => (
                      <RampTokenPickerButton
                        tokens={tokens}
                        tokenRates={tokenRates}
                        onSelect={(tokenId) => field.handleChange(tokenId)}
                        value={field.state.value}
                      />
                    )}
                  />
                }
              />
            </div>

            {/* <div className="flex justify-between">
            <div className="text-xs">{t("You're receiving (estimate)")}</div>
            {symbol && (
              <div className="text-xs">{`1 ${symbol} ≈ ${truncateToSignificantDigits(tokenRateByCurrency ?? 0)} ${fiatCurrency || "$"}`}</div>
            )}
          </div>
          <RampTokenAmountInput /> */}
          </div>

          {quoteConfig && (
            <div className="bg-grey-900 space-y-6 rounded border-0 p-6">
              <div className="text-body leading-paragraph text-sm">{t("Choose Provider")}</div>
              <form.Field
                name="provider"
                children={(field) => (
                  <Providers
                    selected={field.state.value}
                    tokenRates={tokenRates}
                    quoteConfig={quoteConfig}
                    quotes={quotes}
                    onSelect={(p) => field.handleChange(p)}
                  />
                )}
              />
            </div>
          )}

          <div className="bg-grey-900 space-y-6 rounded border-0 p-6">
            <div className="flex gap-4">
              <div className="font-bold text-white">{t("Step 2")}</div>
              <div>{t("Select account")}</div>
            </div>
            <div className="text-xs">{t("Deposit Account")}</div>
            {/* <RampAccountSelect /> */}
          </div>

          <div className="shrink-0"></div>
        </div>
      </ScrollContainer>
      <div className="shrink-0 px-10 pb-10">
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              className="w-full"
              primary
              icon={ExternalLinkIcon}
              disabled={!canSubmit}
              processing={isSubmitting}
            >
              {t("Continue to Ramp")}
            </Button>
          )}
        />
      </div>
    </form>
  )
}

const AmountOut: FC<{
  quotes: RampBuyQuotes
  provider: RampProvider | undefined
  tokenId: TokenId | undefined
}> = ({ quotes, provider, tokenId }) => {
  const token = useToken(tokenId)

  if (!provider || !token) return null
  if (quotes[provider].isLoading)
    return (
      <span className="text-body-disabled bg-body-disabled rounded-xs animate-pulse">0.00001</span>
    )

  if (!quotes[provider].data?.amountOut) return null

  return planckToTokens(quotes[provider].data?.amountOut, token.decimals)
}

const TokenPrice: FC<{
  tokenId: string | null | undefined
  tokenRates: TokenRatesList | null | undefined
  isLoading: boolean
}> = ({ tokenId, tokenRates, isLoading }) => {
  const selectedCurrency = useSelectedCurrency()
  const token = useToken(tokenId)
  const price = useMemo(
    () =>
      tokenId && tokenRates?.[tokenId]
        ? (tokenRates?.[tokenId]?.[selectedCurrency]?.price ?? null)
        : null,
    [selectedCurrency, tokenId, tokenRates],
  )

  if (tokenId && isLoading)
    return (
      <span className="rounded-xs text-body-disabled bg-body-disabled animate-pulse">
        1 ETH = 1600.25 USD
      </span>
    )

  if (!token || !price) return null

  return (
    <span className="text-body-disabled text-tiny">
      1 {token?.symbol} ≈ <Fiat amount={price} forceCurrency={selectedCurrency} noCountUp />
    </span>
  )
}

const RampNumberFieldContainer: FC<{
  input: ReactNode
  button: ReactNode
  errorMessage?: string
}> = ({ input, button, errorMessage }) => (
  <div className="w-full overflow-hidden">
    <div className="border-grey-750 bg-black-secondary flex h-[5.5rem] w-full justify-between overflow-hidden rounded-[12px] border-[1px] p-3 pl-8">
      <div className="flex grow flex-col justify-center truncate">{input}</div>
      <div className="shrink-0">{button}</div>
    </div>
    {errorMessage && <div className="text-tiny mt-1 text-red-500">{errorMessage}</div>}
  </div>
)

const Providers: FC<{
  quoteConfig: BuyQuoteConfig
  selected: RampProvider | undefined
  quotes: {
    ramp: UseQueryResult<BuyQuote | null, Error>
    coinbase: UseQueryResult<BuyQuote | null, Error>
  }
  tokenRates: TokenRatesList | null | undefined
  onSelect: (provider: "ramp" | "coinbase") => void
}> = ({ quoteConfig, tokenRates, selected, quotes, onSelect }) => {
  return (
    <div className="flex flex-col gap-6">
      <ProviderButton
        quoteConfig={quoteConfig}
        tokenRates={tokenRates}
        provider="ramp"
        isSelected={selected === "ramp"}
        query={quotes.ramp}
        onClick={() => onSelect("ramp")}
      />
      <ProviderButton
        quoteConfig={quoteConfig}
        tokenRates={tokenRates}
        provider="coinbase"
        isSelected={selected === "coinbase"}
        query={quotes.coinbase}
        onClick={() => onSelect("coinbase")}
      />
    </div>
  )
}

/**
 * @param fiatIn amount of fiat in
 * @param tokenOut amount of tokens that matches the fiatIn argument
 * @param decimals decimals of the token
 *
 * @returns the amount of fiat that it would cost to buy one token
 */
const getTokenPrice = (fiatIn: number, tokenOut: bigint, decimals: number): number => {
  if (tokenOut === 0n) throw new Error("tokenOut cannot be zero")

  const tokenOutInDecimal = Number(tokenOut) / Math.pow(10, decimals)
  return fiatIn / tokenOutInDecimal
}

const ProviderButton: FC<{
  quoteConfig: BuyQuoteConfig
  tokenRates: TokenRatesList | null | undefined
  provider: RampProvider
  isSelected: boolean
  query: UseQueryResult<BuyQuote | null, Error>
  onClick: () => void
}> = ({
  quoteConfig: { tokenId, currencyCode, amount: amountIn },
  tokenRates,
  provider,
  isSelected,
  query: { data, isLoading, error },
  onClick,
}) => {
  const { t } = useTranslation()
  const selectedCurrency = useSelectedCurrency()
  const token = useToken(tokenId)

  const amount = useMemo(() => {
    if (!data || !token) return null
    return new BalanceFormatter(data?.amountOut, token?.decimals, tokenRates?.[token.id])
  }, [data, token, tokenRates])

  const price = useMemo(() => {
    if (!data || !token) return null
    const price = getTokenPrice(amountIn - data.fee, BigInt(data.amountOut), token.decimals)
    return formatPrice(price, currencyCode, true)
  }, [amountIn, currencyCode, data, token])

  if (isLoading)
    return (
      <div className="border-grey-700 leading-paragraph text-body-disabled flex h-[9.2rem] flex-col justify-between gap-8 rounded border p-6 text-left">
        <div className="flex justify-between">
          <div className="flex flex-col gap-2">
            <div className="bg-body-disabled rounded-xs animate-pulse text-sm font-bold">
              1.069518 ETH
            </div>
            <div className="bg-body-disabled rounded-xs text-tiny animate-pulse">$1987.47</div>
          </div>
          <div>
            <div className="bg-body-disabled rounded-xs animate-pulse text-xs">Ramp</div>
          </div>
        </div>
        <div className="text-tiny flex gap-8">
          <div className="bg-body-disabled rounded-xs animate-pulse">1 ETH ≈ $1810.13</div>
          <div className="bg-body-disabled rounded-xs animate-pulse">Fee ~$0.00</div>
        </div>
      </div>
    )

  // TODO
  if (error || !data)
    return (
      <div className="border-grey-700 leading-paragraph text-body-secondary flex h-[9.2rem] flex-col justify-between gap-8 rounded border p-6 text-left">
        <div className="flex justify-between">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-bold">{error?.message ?? "Unavailable"}</div>
            <div className="text-tiny"></div>
          </div>
          <div className="text-xs">{provider}</div>
        </div>
        <div className="text-tiny flex gap-8">
          <div></div>
          <div></div>
        </div>
      </div>
    )

  return (
    <button
      type="button"
      className={classNames(
        "bg-grey-900 leading-paragraph flex h-[9.2rem] flex-col justify-between gap-8 rounded border p-6 text-left",
        isSelected
          ? "border-body bg-grey-850 text-body"
          : "border-grey-700 enabled:hover:bg-grey-850 enabled:hover:border-grey-500 text-body-secondary",
      )}
      onClick={onClick}
    >
      <div className="flex justify-between">
        <div className="flex flex-col gap-2">
          <div className="text-sm font-bold">
            <Tokens
              decimals={token?.decimals}
              amount={amount?.tokens}
              symbol={token?.symbol}
              isBalance
            />
          </div>
          <div className="text-body-secondary text-tiny">
            <Fiat amount={amount?.fiat(selectedCurrency)} noCountUp />
          </div>
        </div>
        <div className="text-body-secondary text-xs">{provider}</div>
      </div>
      <div className="text-tiny flex gap-8">
        <div>
          1 {token?.symbol} ≈ {price}
        </div>
        <div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {t("Fee")} {formatPrice(data?.fee ?? 0, currencyCode, true)}
        </div>
      </div>
    </button>
  )
}
