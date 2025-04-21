/* eslint-disable react/no-children-prop */
import { TokenId } from "@talismn/chaindata-provider"
import { ExternalLinkIcon } from "@talismn/icons"
import { TokenRatesList } from "@talismn/token-rates"
import { classNames, formatPrice, planckToTokens } from "@talismn/util"
import { UseQueryResult } from "@tanstack/react-query"
import { BalanceFormatter } from "extension-core"
import { capitalize } from "lodash"
import { FC, ReactNode, useEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { useSelectedCurrency, useToken } from "@ui/state"

import { Fiat } from "../../Fiat"
import Tokens from "../../Tokens"
import logoCoinbase from "../assets/logo-coinbase.svg?url"
import logoRamp from "../assets/logo-ramp.svg?url"
import { RampProvider } from "../coinbase/types"
import { RampAccountPickerButton } from "../shared/RampAccountPickerButton"
import { RampCurrencyPickerButton } from "../shared/RampCurrencyPickerButton"
import { RampTokenPickerButton } from "../shared/RampTokenPickerButton"
import { useRampBuyForm } from "./useRampBuyForm"
import { RampBuyQuote, RampBuyQuoteOptions, RampBuyQuoteQuery } from "./useRampBuyQuotes"

const PROVIDER_LOGOS = {
  coinbase: logoCoinbase,
  ramp: logoRamp,
}

export const RampBuyForm = () => {
  const { t } = useTranslation()

  const {
    form,
    formData,
    currencies,
    tokenRates,
    isLoadingTokenRates,
    quoteOpts,
    quotes,
    tokens,
    accounts,
  } = useRampBuyForm()

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
        <div className="px-10 pb-10">
          <div className="flex size-full shrink-0 flex-col gap-6">
            <FieldSet label={t("Select Assets")}>
              <div className="space-y-6">
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
                    <div className="leading-paragraph text-xs">
                      {t("You're receiving (estimate)")}
                    </div>
                    <div className="leading-paragraph text-xs">
                      <TokenPrice
                        tokenId={quoteOpts?.tokenId}
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
                              tokenId={quoteOpts?.tokenId}
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
              </div>
            </FieldSet>

            {quoteOpts && (
              <FieldSet label={t("Choose Provider")}>
                <form.Field
                  name="provider"
                  children={(field) => (
                    <Providers
                      selected={field.state.value}
                      tokenRates={tokenRates}
                      quoteConfig={quoteOpts}
                      quotes={quotes}
                      onSelect={(p) => field.handleChange(p)}
                    />
                  )}
                />
              </FieldSet>
            )}

            {!!formData.provider && !!formData.tokenId && (
              <FieldSet label={t("Select Receiver")}>
                <form.Field
                  name="account"
                  children={(field) => (
                    <RampAccountPickerButton
                      accounts={accounts}
                      tokenRates={tokenRates}
                      balancesDisplayMode="total"
                      tokenId={formData.tokenId!}
                      selected={field.state.value}
                      onSelect={(address) => field.handleChange(address)}
                    />
                  )}
                />
              </FieldSet>
            )}
          </div>
        </div>
      </ScrollContainer>
      <div className="shrink-0 px-10 pb-10">
        <form.Subscribe
          selector={(state) =>
            [state.canSubmit, state.isSubmitting, state.values.provider] as const
          }
          children={([canSubmit, isSubmitting, provider]) => (
            <Button
              type="submit"
              className="w-full"
              primary
              icon={ExternalLinkIcon}
              disabled={!canSubmit}
              processing={isSubmitting}
            >
              {provider
                ? t("Continue to {{provider}}", { provider: capitalize(provider) })
                : t("Continue to Buy")}
            </Button>
          )}
        />
      </div>
    </form>
  )
}

const FieldSet: FC<{ label: ReactNode; children: ReactNode }> = ({ label, children }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [])

  return (
    <div ref={ref} className="bg-grey-900 space-y-6 rounded border-0 p-6">
      <div className="text-body leading-paragraph text-sm">{label}</div>
      <div>{children}</div>
    </div>
  )
}

const ProviderLabel: FC<{ provider: RampProvider }> = ({ provider }) => {
  return (
    <span className="text-body-secondary inline-flex items-center gap-2 text-xs">
      <span
        className={classNames(
          "inline-block size-8 rounded-full",
          provider === "ramp" && "bg-white p-1", // figma didnt use an svg, wrap the official one to make it look as expected
        )}
      >
        <img src={PROVIDER_LOGOS[provider]} alt="" className="size-full" />
      </span>
      <span>{capitalize(provider)}</span>
    </span>
  )
}

const AmountOut: FC<{
  quotes: RampBuyQuoteQuery[]
  provider: RampProvider | undefined
  tokenId: TokenId | undefined
}> = ({ quotes, provider, tokenId }) => {
  const token = useToken(tokenId)
  const quote = useMemo(
    () => quotes.find((q) => q.provider === provider)?.quote,
    [quotes, provider],
  )

  if (!quote || !token) return null

  if (quote.isLoading)
    return (
      <span className="text-body-disabled bg-body-disabled rounded-xs animate-pulse">0.00001</span>
    )

  if (!quote.data?.amountOut) return null

  return planckToTokens(quote.data?.amountOut, token.decimals)
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
  quoteConfig: RampBuyQuoteOptions
  selected: RampProvider | undefined
  quotes: RampBuyQuoteQuery[]
  tokenRates: TokenRatesList | null | undefined
  onSelect: (provider: "ramp" | "coinbase") => void
}> = ({ quoteConfig, tokenRates, selected, quotes, onSelect }) => {
  return (
    <div className="flex flex-col gap-6">
      {quotes.map((q) => (
        <ProviderButton
          key={q.provider}
          quoteConfig={quoteConfig}
          tokenRates={tokenRates}
          provider={q.provider}
          isSelected={selected === q.provider}
          query={q.quote}
          onClick={() => onSelect(q.provider)}
        />
      ))}
    </div>
  )
}

const ProviderButton: FC<{
  quoteConfig: RampBuyQuoteOptions
  tokenRates: TokenRatesList | null | undefined
  provider: RampProvider
  isSelected: boolean
  query: UseQueryResult<RampBuyQuote | null, Error>
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
            <div className="text-xs">
              <ProviderLabel provider={provider} />
            </div>
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
          <div className="text-xs">
            <ProviderLabel provider={provider} />
          </div>
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
        <div className="text-body-secondary text-xs">
          <ProviderLabel provider={provider} />
        </div>
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
