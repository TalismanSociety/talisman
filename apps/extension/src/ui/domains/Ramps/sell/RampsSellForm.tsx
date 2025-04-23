/* eslint-disable react/no-children-prop */
import { ExternalLinkIcon } from "@talismn/icons"
import { formatPrice } from "@talismn/util"
import { UseQueryResult } from "@tanstack/react-query"
import { capitalize } from "lodash"
import { FC, useEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { useToken } from "@ui/state"

import { RampsAccountPickerButton } from "../shared/RampsAccountPickerButton"
import { RampsCurrencyPickerButton } from "../shared/RampsCurrencyPickerButton"
import { RampsFieldSet } from "../shared/RampsFieldSet"
import { RampsNumberFieldContainer } from "../shared/RampsNumberFieldContainer"
import {
  RampsProviderButton,
  RampsProviderButtonError,
  RampsProviderButtonSkeleton,
} from "../shared/RampsProviders"
import { RampsTokenPickerButton } from "../shared/RampsTokenPickerButton"
import { RampsTokenPrice } from "../shared/RampsTokenPrice"
import { RampsFormSharedData, RampsProvider } from "../shared/types"
import { RampsSellQuote, RampsSellQuoteOptions, RampsSellQuoteQuery } from "./types"
import { useRampsSellForm } from "./useRampsSellForm"

export const RampsSellForm: FC<{
  defaults: RampsFormSharedData
  onChange: (val: RampsFormSharedData) => void
}> = ({ defaults, onChange }) => {
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
  } = useRampsSellForm(defaults)

  useEffect(() => {
    // update parent state so those values can be reused if switching tab
    if (defaults.currencyCode !== formData.currencyCode || defaults.tokenId !== formData.tokenId)
      onChange({ currencyCode: formData.currencyCode, tokenId: formData.tokenId })
  }, [defaults.currencyCode, defaults.tokenId, formData.currencyCode, formData.tokenId, onChange])

  const refInput = useRef<HTMLInputElement>(null)

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
                  <div className="leading-paragraph text-xs">{t("You send")}</div>
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
                        name="tokenId"
                        children={(field) => (
                          <RampsTokenPickerButton
                            tokens={tokens}
                            tokenRates={tokenRates}
                            onSelect={(tokenId) => {
                              field.handleChange(tokenId)
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
                        tokenId={quoteOpts?.tokenId}
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
                              currencyCode={quoteOpts?.currencyCode}
                            />
                          </div>
                        )}
                      />
                    }
                    button={
                      <form.Field
                        name="currencyCode"
                        children={(field) => (
                          <RampsCurrencyPickerButton
                            currencies={currencies}
                            onSelect={(currency) => field.handleChange(currency)}
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
                : t("Continue to Sell")}
            </Button>
          )}
        />
      </div>
    </form>
  )
}

const AmountOut: FC<{
  quotes: RampsSellQuoteQuery[]
  provider: RampsProvider | undefined
  currencyCode: string | undefined
}> = ({ quotes, provider, currencyCode }) => {
  const query = useMemo(
    () => quotes.find((q) => q.provider === provider)?.query,
    [quotes, provider],
  )

  if (!query || !currencyCode) return null

  if (query.isLoading)
    return (
      <span className="text-body-disabled bg-body-disabled rounded-xs animate-pulse">0.00001</span>
    )

  if (query.data?.type === "error" || !query.data?.amountOut) return null

  return <>{formatPrice(Number(query.data.amountOut), currencyCode, false)}</>
}

const Providers: FC<{
  quoteConfig: RampsSellQuoteOptions
  selected: RampsProvider | undefined
  quotes: RampsSellQuoteQuery[]
  onSelect: (provider: RampsProvider) => void
}> = ({ quoteConfig, selected, quotes, onSelect }) => {
  return (
    <div className="flex flex-col gap-6">
      {quotes.map((q) => (
        <ProviderButton
          key={q.provider}
          quoteConfig={quoteConfig}
          provider={q.provider}
          isSelected={selected === q.provider}
          query={q.query}
          onClick={() => onSelect(q.provider)}
        />
      ))}
    </div>
  )
}

const ProviderButton: FC<{
  quoteConfig: RampsSellQuoteOptions
  provider: RampsProvider
  isSelected: boolean
  query: UseQueryResult<RampsSellQuote | null, Error>
  onClick: () => void
}> = ({
  quoteConfig: { tokenId, currencyCode },
  provider,
  isSelected,
  query: { data, isLoading, error },
  onClick,
}) => {
  const { t } = useTranslation()
  const token = useToken(tokenId)

  const amountOut = useMemo(() => {
    if (!data) return null
    if (data.type === "error") return null
    return formatPrice(data.amountOut, currencyCode, true)
  }, [currencyCode, data])

  if (isLoading || !token) return <RampsProviderButtonSkeleton provider={provider} />

  if (error || !data || data.type === "error")
    return (
      <RampsProviderButtonError
        provider={provider}
        title={error?.message ?? (data?.type === "error" && data.message) ?? t("Unavailable")}
        description={(data?.type === "error" && data.description) ?? null}
      />
    )

  return (
    <RampsProviderButton
      provider={provider}
      isSelected={isSelected}
      onClick={onClick}
      title={amountOut}
      tokenSymbol={token.symbol}
      tokenPrice={data.tokenPrice}
      fee={data.fee}
      currencyCode={currencyCode}
    />
  )
}
