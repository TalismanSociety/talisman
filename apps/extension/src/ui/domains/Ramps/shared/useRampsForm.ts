import { log } from "@common/log"
import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import type { Token } from "@talismn/chaindata-provider"
import { encodeAddressSs58, isAddressEqual } from "@talismn/crypto"
import { getErrorMessage, isTruthy } from "@talismn/util"
import { useForm, useStore } from "@tanstack/react-form"
import type { UseQueryResult } from "@tanstack/react-query"
import { notify } from "@ui/components/Notifications"
import { useSpecificTokenRates } from "@ui/hooks/useSpecificTokenRates"
import { useAccounts } from "@ui/state/accounts"
import { getNetworkById$, getToken$, useNetworkById, useToken } from "@ui/state/chaindata"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useDebounce } from "react-use"
import { firstValueFrom } from "rxjs"
import { z } from "zod/v4"

import type { RampsFormSharedData, RampsProvider, RampsQuoteError } from "./types"

const schema = z.object({
  currencyCode: z.string().nonempty(),
  tokenId: z.string().nonempty(),
  amount: z.number().gt(0),
  provider: z.enum(["coinbase", "ramp"]),
  account: z.string().nonempty(),
})

export type RampsFormData = z.infer<typeof schema>

type RampsQuoteSuccess = {
  type: "success"
  amountOut: string | number
  getRedirectUrl: (address: string) => string | Promise<string>
}

type RampsQuoteQuery<TQuote> = {
  provider: RampsProvider
  query: UseQueryResult<TQuote | null, Error>
}

type RampsQuoteOptions = { currencyCode: string; tokenId: string; amount: number }

export type RampsFormConfig<TCurrencies, TToken extends Token, TQuote> = {
  useCurrencies: () => { currencies: TCurrencies }
  useTokens: (currencyCode: string | undefined) => { tokens: TToken[] }
  useQuotes: (options: RampsQuoteOptions | null) => RampsQuoteQuery<TQuote>[]
  beforeRedirect?: (formData: RampsFormData) => Promise<void>
}

export const useRampsForm = <
  TCurrencies,
  TToken extends Token,
  TQuote extends RampsQuoteError | RampsQuoteSuccess,
>(
  defaults: RampsFormSharedData,
  {
    useCurrencies,
    useTokens,
    useQuotes,
    beforeRedirect,
  }: RampsFormConfig<TCurrencies, TToken, TQuote>
) => {
  const { t } = useTranslation()
  const refQuote = useRef<TQuote | null>(null)

  const form = useForm({
    defaultValues: defaults as Partial<RampsFormData>,
    onSubmit: async ({ value }) => {
      try {
        const quote = refQuote.current
        if (!quote || quote.type === "error") throw new Error("No quote")
        const formData = schema.parse(value)

        await beforeRedirect?.(formData)

        await redirectToProvider(formData, quote)
      } catch (err) {
        log.error("Failed to submit", err)
        notify({
          type: "error",
          title: t("Error"),
          subtitle: getErrorMessage(err, t("Unknown error")),
          cause: err,
        })
      }
    },
    validators: {
      onMount: schema,
      onChange: schema,
    },
  })

  const formData = useStore(form.store, (state) => state.values)
  const { currencies } = useCurrencies()
  const { tokens } = useTokens(formData.currencyCode)
  const { data: tokenRates, isLoading: isLoadingTokenRates } = useSpecificTokenRates(tokens)

  const [amount, setAmount] = useState<number | undefined>()
  useDebounce(() => setAmount(formData.amount), 250, [formData.amount])

  const quoteOpts = useMemo(() => {
    if (!amount || !formData.currencyCode || !formData.tokenId) return null
    return { currencyCode: formData.currencyCode, amount, tokenId: formData.tokenId }
  }, [amount, formData.currencyCode, formData.tokenId])

  const quotes = useQuotes(quoteOpts)

  const token = useToken(formData.tokenId)
  const network = useNetworkById(token?.networkId)
  const allAccounts = useAccounts("portfolio")

  const accounts = useMemo(
    () =>
      allAccounts.filter(
        (account) => !!network && isAccountCompatibleWithNetwork(network, account)
      ),
    [allAccounts, network]
  )

  // clear provider choice if the token or currency change
  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    form.resetField("provider")

    // @dev: make sure quoteOpts?.tokenId, formData.currencyCode are dependencies in the array below
  }, [quoteOpts?.tokenId, formData.currencyCode, form])

  // select best provider once quotes are ready
  useEffect(() => {
    if (!formData.provider && quotes.every((q) => !q.query.isLoading)) {
      const getAmountOut = (q: TQuote | null | undefined) =>
        q?.type === "success" ? q.amountOut : null

      const bestQuote = quotes
        .map((q) => ({ provider: q.provider, amountOut: getAmountOut(q.query.data) }))
        .filter((q) => isTruthy(q.amountOut))
        .sort((a, b) => Number(b.amountOut ?? 0) - Number(a.amountOut ?? 0))[0]

      if (bestQuote) form.setFieldValue("provider", bestQuote.provider) //providerField.setValue(bestQuote.provider)
    }
  }, [form, formData.provider, quotes])

  // clear account if not compatible with token
  useEffect(() => {
    // `accounts` contain only compatible accounts
    if (formData.account && !accounts.some((a) => isAddressEqual(a.address, formData.account!)))
      form.resetField("account")
  }, [accounts, form, formData.account])

  // store the current quote as ref so that submit function can access it, without generating re-renders
  useEffect(() => {
    const providerQuote = quotes.find((q) => q.provider === formData.provider)
    refQuote.current = providerQuote?.query?.data ?? null
  }, [formData.provider, quotes])

  return {
    form,
    currencies,
    tokenRates,
    isLoadingTokenRates,
    quoteOpts,
    quotes,
    tokens,
    formData,
    accounts,
  }
}

const redirectToProvider = async (formData: RampsFormData, quote: RampsQuoteSuccess) => {
  let address = formData.account

  const token = await firstValueFrom(getToken$(formData.tokenId))
  if (token?.networkId) {
    const chain = await firstValueFrom(getNetworkById$(token.networkId))
    if (chain?.platform === "polkadot" && chain.account === "*25519")
      address = encodeAddressSs58(address, chain.prefix)
  }

  const url = await quote.getRedirectUrl(address)

  window.open(url, "_blank", "noopener noreferrer")
}
