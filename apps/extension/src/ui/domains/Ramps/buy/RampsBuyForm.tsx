/* eslint-disable react/no-children-prop */
import { BalanceFormatter } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { ExternalLinkIcon } from "@talismn/icons"
import { TokenRatesList } from "@talismn/token-rates"
import { planckToTokens } from "@talismn/util"
import { capitalize } from "lodash-es"
import { FC, useEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Button, useOpenCloseStatus } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useSelectedCurrency, useToken } from "@ui/state"

import { getRampsQuoteError } from "../shared/getRampsQuoteError"
import { RampsAccountPickerButton } from "../shared/RampsAccountPickerButton"
import { RampsCurrencyPickerButton } from "../shared/RampsCurrencyPickerButton"
import { RampsFieldSet } from "../shared/RampsFieldSet"
import { RampsNumberFieldContainer } from "../shared/RampsNumberFieldContainer"
import { RampsProviderProps, RampsProviders } from "../shared/RampsProviders"
import { RampsTokenPickerButton } from "../shared/RampsTokenPickerButton"
import { RampsTokenPrice } from "../shared/RampsTokenPrice"
import { RampsFormSharedData, RampsProvider } from "../shared/types"
import { RampsBuyQuoteOptions, RampsBuyQuoteQuery } from "./types"
import { useRampsBuyForm } from "./useRampsBuyForm"

export const RampsBuyForm: FC<{
  defaults: RampsFormSharedData
  onChange: (val: RampsFormSharedData) => void
}> = ({ defaults, onChange }) => {
  const { t } = useTranslation()

  const { form, formData, tokenRates, isLoadingTokenRates, quoteOpts, quotes, tokens, accounts } =
    useRampsBuyForm(defaults)

  useEffect(() => {
    // update parent state so those values can be reused if switching tab
    if (defaults.currencyCode !== formData.currencyCode || defaults.tokenId !== formData.tokenId)
      onChange({ currencyCode: formData.currencyCode, tokenId: formData.tokenId })
  }, [defaults.currencyCode, defaults.tokenId, formData.currencyCode, formData.tokenId, onChange])

  const refInput = useRef<HTMLInputElement>(null)
  const transitionStatus = useOpenCloseStatus()
  useEffect(() => {
    if (transitionStatus === "open") refInput.current?.focus()
  }, [transitionStatus])

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
            <RampsFieldSet label={t("Assets")}>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="leading-paragraph text-xs">{t("You pay")}</div>
                  <RampsNumberFieldContainer
                    withFocusWithin
                    input={
                      <form.Field
                        name="amount"
                        children={(field) => (
                          <input
                            ref={refInput}
                            type="number"
                            className="text-md peer w-[15rem] min-w-0 appearance-none border-none bg-transparent font-bold leading-none text-white md:max-w-fit"
                            value={field.state.value ?? ""}
                            onBlur={field.handleBlur}
                            placeholder="100"
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
                          <RampsCurrencyPickerButton
                            onSelect={(currency) => {
                              field.handleChange(currency)
                              refInput.current?.focus()
                            }}
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
                      <RampsTokenPrice
                        tokenId={formData?.tokenId}
                        tokenRates={tokenRates}
                        isLoading={isLoadingTokenRates}
                      />
                    </div>
                  </div>
                  <RampsNumberFieldContainer
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
                          <RampsTokenPickerButton
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
            </RampsFieldSet>

            {quoteOpts && (
              <RampsFieldSet label={t("Provider")}>
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
              </RampsFieldSet>
            )}

            {!!formData.provider && !!formData.tokenId && (
              <RampsFieldSet label={t("Receiver")}>
                <form.Field
                  name="account"
                  children={(field) => (
                    <RampsAccountPickerButton
                      accounts={accounts}
                      tokenRates={tokenRates}
                      balancesDisplayMode="total"
                      tokenId={formData.tokenId!}
                      selected={field.state.value}
                      onSelect={(address) => field.handleChange(address)}
                    />
                  )}
                />
              </RampsFieldSet>
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

const AmountOut: FC<{
  quotes: RampsBuyQuoteQuery[]
  provider: RampsProvider | undefined
  tokenId: TokenId | undefined
}> = ({ quotes, provider, tokenId }) => {
  const token = useToken(tokenId)
  const query = useMemo(
    () => quotes.find((q) => q.provider === provider)?.query,
    [quotes, provider],
  )

  const value = useMemo(() => {
    if (!query?.data || !token) return null
    if (query?.data?.type === "error") return null
    return planckToTokens(query.data.amountOut, token.decimals)
  }, [query?.data, token])

  if (query?.isLoading)
    return (
      <span className="text-body-disabled bg-body-disabled rounded-xs animate-pulse">0.00001</span>
    )

  return value
}

const Providers: FC<{
  quoteConfig: RampsBuyQuoteOptions
  selected: RampsProvider | undefined
  quotes: RampsBuyQuoteQuery[]
  tokenRates: TokenRatesList | null | undefined
  onSelect: (provider: RampsProvider) => void
}> = ({
  quoteConfig: { tokenId, currencyCode, amount },
  tokenRates,
  selected,
  quotes,
  onSelect,
}) => {
  const token = useToken(tokenId)
  const selectedCurrency = useSelectedCurrency()

  const options = useMemo(() => {
    return quotes.map(({ query, provider }): RampsProviderProps => {
      if (query.isLoading || !token) return { type: "loading", provider }
      if (query.error || !query.data) return { ...getRampsQuoteError(), provider }
      if (query.data.type === "error") return { ...query.data, provider }

      const amountOut = new BalanceFormatter(
        query.data.amountOut,
        token.decimals,
        tokenRates?.[token.id],
      )

      const tokenPrice = getTokenPrice(
        amount - query.data.fee,
        BigInt(query.data.amountOut),
        token.decimals,
      )

      return {
        type: "available",
        provider,
        title: <Tokens decimals={token.decimals} amount={amountOut.tokens} symbol={token.symbol} />,
        subtitle: <Fiat amount={amountOut.fiat(selectedCurrency)} noCountUp />,
        tokenSymbol: token.symbol,
        tokenPrice,
        fee: query.data.fee,
        currencyCode,
      }
    })
  }, [amount, currencyCode, quotes, selectedCurrency, token, tokenRates])

  return <RampsProviders options={options} selected={selected} onSelect={onSelect} />
}

/**
 * Calculates the price of a token in fiat based on a quote output
 *
 * @param fiatIn amount of fiat in
 * @param tokenOut amount of tokens that matches the fiatIn argument
 * @param decimals decimals of the token
 *
 * @returns the amount of fiat that it would cost to buy one token
 */
const getTokenPrice = (fiatIn: number, tokenOut: bigint, decimals: number): number | null => {
  if (tokenOut === 0n) return null

  const tokenOutInDecimal = Number(tokenOut) / Math.pow(10, decimals)
  return fiatIn / tokenOutInDecimal
}
