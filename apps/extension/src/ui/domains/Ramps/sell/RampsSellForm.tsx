/* eslint-disable react/no-children-prop */
import { BalanceFormatter } from "@talismn/balances"
import { ExternalLinkIcon } from "@talismn/icons"
import { TokenRatesList } from "@talismn/token-rates"
import { formatPrice, tokensToPlanck } from "@talismn/util"
import { capitalize } from "lodash-es"
import { FC, useEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Button, useOpenCloseStatus } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { BalanceByParamsProps, useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useToken } from "@ui/state"

import { getRampsQuoteError } from "../shared/getRampsQuoteError"
import { RampsAccountPickerButton } from "../shared/RampsAccountPickerButton"
import { RampsCurrencyPickerButton } from "../shared/RampsCurrencyPickerButton"
import { RampsFieldSet } from "../shared/RampsFieldSet"
import { RampsNumberFieldContainer } from "../shared/RampsNumberFieldContainer"
import { RampsProviderProps, RampsProviders } from "../shared/RampsProviders"
import { RampsTokenPickerButton } from "../shared/RampsTokenPickerButton"
import { RampsTokenPrice } from "../shared/RampsTokenPrice"
import { RampsFormSharedData, RampsProvider } from "../shared/types"
import { RampsSellQuoteOptions, RampsSellQuoteQuery } from "./types"
import { useRampsSellForm } from "./useRampsSellForm"

export const RampsSellForm: FC<{
  defaults: RampsFormSharedData
  onChange: (val: RampsFormSharedData) => void
}> = ({ defaults, onChange }) => {
  const { t } = useTranslation()

  const { form, formData, tokenRates, isLoadingTokenRates, quoteOpts, quotes, tokens, accounts } =
    useRampsSellForm(defaults)

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
              <RampsFieldSet
                label={t("Receiver")}
                extra={
                  <AccountBalance
                    address={formData.account}
                    tokenId={formData.tokenId}
                    amount={formData.amount}
                    tokenRates={tokenRates}
                  />
                }
              >
                <form.Field
                  name="account"
                  children={(field) => (
                    <RampsAccountPickerButton
                      accounts={accounts}
                      tokenRates={tokenRates}
                      balancesDisplayMode="transferable"
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

const AccountBalance: FC<{
  address: string | undefined
  tokenId: string | undefined
  amount: number | undefined
  tokenRates: TokenRatesList
}> = ({ address, tokenId, amount, tokenRates }) => {
  const { t } = useTranslation()
  const balProps = useMemo<BalanceByParamsProps>(() => {
    return address && tokenId
      ? {
          addressesAndTokens: { addresses: [address], tokenIds: [tokenId] },
        }
      : {}
  }, [address, tokenId])

  const { status, balances } = useBalancesByParams(balProps)

  const token = useToken(tokenId)

  const balance = useMemo(() => {
    if (!token || status !== "live") return false
    const bal = balances.find({ address, tokenId }).each[0]
    if (!bal) return null
    return new BalanceFormatter(bal.transferable.planck, token.decimals, tokenRates[token.id])
  }, [address, balances, status, token, tokenId, tokenRates])

  const isInsufficient = useMemo(() => {
    if (!balance || !token || !amount) return false
    const required = tokensToPlanck(amount.toString(), token.decimals)
    return BigInt(required) > BigInt(balance.planck)
  }, [amount, balance, token])

  if (!address || !token) return null

  if (!balance)
    return (
      <span className="bg-body-disabled text-body-disabled rounded-xs animate-pulse">
        Bal: 0.0000 XXX
      </span>
    )

  if (isInsufficient) return <span className="text-alert-warn">{t("Insufficient balance")}</span>

  return (
    <>
      {t("Bal:")}{" "}
      <Tokens
        className="text-xs"
        isBalance
        amount={balance.tokens}
        decimals={token.decimals}
        symbol={token.symbol}
      />
    </>
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
}> = ({ quoteConfig: { tokenId, currencyCode }, selected, quotes, onSelect }) => {
  const token = useToken(tokenId)

  const options = useMemo(() => {
    return quotes.map(({ query, provider }): RampsProviderProps => {
      if (query.isLoading || !token) return { type: "loading", provider }
      if (query.error || !query.data) return { ...getRampsQuoteError(), provider }
      if (query.data.type === "error") return { ...query.data, provider }

      const amountOut = formatPrice(query.data.amountOut, currencyCode, true)

      return {
        type: "available",
        provider,
        title: amountOut,
        tokenSymbol: token.symbol,
        tokenPrice: query.data.tokenPrice,
        fee: query.data.fee,
        currencyCode,
      }
    })
  }, [currencyCode, quotes, token])

  return <RampsProviders options={options} selected={selected} onSelect={onSelect} />
}
