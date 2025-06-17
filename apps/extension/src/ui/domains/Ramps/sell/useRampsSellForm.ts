import { encodeAddressSs58, isAddressEqual } from "@talismn/crypto"
import { isTruthy } from "@talismn/util"
import { useForm, useStore } from "@tanstack/react-form"
import { isAccountCompatibleWithNetwork } from "extension-core"
import { log } from "extension-shared"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useDebounce } from "react-use"
import { firstValueFrom } from "rxjs"
import { z } from "zod"

import { notify } from "@talisman/components/Notifications"
import { useSpecificTokenRates } from "@ui/hooks/useSpecificTokenRates"
import { getNetworkById$, getToken$, useAccounts, useNetworkById, useToken } from "@ui/state"

import { RampsFormSharedData } from "../shared/types"
import { RampsSellQuote, RampsSellQuoteSuccess } from "./types"
import { useRampsSellCurrencies } from "./useRampsSellCurrencies"
import { useRampsSellQuotes } from "./useRampsSellQuotes"
import { useRampsSellTokens } from "./useRampsSellTokens"

const schema = z.object({
  currencyCode: z.string().nonempty(),
  tokenId: z.string().nonempty(),
  amount: z.number().gt(0),
  provider: z.enum(["coinbase", "ramp"]),
  account: z.string().nonempty(),
})

type FormData = z.infer<typeof schema>

export const useRampsSellForm = (defaults: RampsFormSharedData) => {
  const { t } = useTranslation()
  const refQuote = useRef<RampsSellQuote | null>(null)

  const form = useForm({
    defaultValues: defaults as Partial<FormData>,
    onSubmit: async ({ value }) => {
      try {
        const quote = refQuote.current
        if (!quote || quote.type === "error") throw new Error("No quote")
        const formData = schema.parse(value)

        await redirectToProvider(formData, quote)
      } catch (err) {
        log.error("Failed to submit", err)
        notify({
          type: "error",
          title: t("Error"),
          subtitle: (err as Error)?.message,
        })
      }
    },
    validators: {
      onMount: schema,
      onChange: schema,
    },
  })

  const formData = useStore(form.store, (state) => state.values)
  const { currencies } = useRampsSellCurrencies()
  const { tokens } = useRampsSellTokens(formData.currencyCode)
  const { data: tokenRates, isLoading: isLoadingTokenRates } = useSpecificTokenRates(tokens)

  const [amount, setAmount] = useState<number | undefined>()
  useDebounce(() => setAmount(formData.amount), 250, [formData.amount])

  const quoteOpts = useMemo(() => {
    if (!amount || !formData.currencyCode || !formData.tokenId) return null
    return { currencyCode: formData.currencyCode, amount, tokenId: formData.tokenId }
  }, [amount, formData.currencyCode, formData.tokenId])

  const quotes = useRampsSellQuotes(quoteOpts)

  const token = useToken(formData.tokenId)
  const network = useNetworkById(token?.networkId)
  const allAccounts = useAccounts("portfolio")

  const accounts = useMemo(
    () =>
      allAccounts.filter(
        (account) => !!network && isAccountCompatibleWithNetwork(network, account),
      ),
    [allAccounts, network],
  )

  // clear provider choice if the token or currency change
  useEffect(() => {
    form.resetField("provider")

    // @dev: make sure quoteOpts?.tokenId, formData.currencyCode are dependencies in the array below
  }, [quoteOpts?.tokenId, formData.currencyCode, form])

  // select best provider once quotes are ready
  useEffect(() => {
    if (!formData.provider && quotes.every((q) => !q.query.isLoading)) {
      const getAmountOut = (q: RampsSellQuote | null | undefined) =>
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

const redirectToProvider = async (formData: FormData, quote: RampsSellQuoteSuccess) => {
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
