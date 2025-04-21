import { encodeAddressSs58, isAddressEqual } from "@talismn/crypto"
import { useForm, useStore } from "@tanstack/react-form"
import { isAccountCompatibleWithChain, isAccountEthereum } from "extension-core"
import { chaindataProvider } from "extension-core/src/rpcs/chaindata"
import { log } from "extension-shared"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useDebounce } from "react-use"
import { z } from "zod"

import { notify } from "@talisman/components/Notifications"
import { useSpecificTokenRates } from "@ui/hooks/useSpecificTokenRates"
import { useAccounts, useChain, useToken } from "@ui/state"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"

import { useRampBuyCurrencies } from "./useRampBuyCurrencies"
import { RampBuyQuote, useRampBuyQuotes } from "./useRampBuyQuotes"
import { useRampBuyTokens } from "./useRampBuyTokens"

const schema = z.object({
  currencyCode: z.string().nonempty(),
  tokenId: z.string().nonempty(),
  amount: z.number().gt(0),
  provider: z.enum(["coinbase", "ramp"]),
  account: z.string().nonempty(),
})

type FormData = z.infer<typeof schema>

// {
//   currencyCode?: string
//   tokenId?: TokenId
//   amount?: number
//   provider?: RampProvider
//   account?: string
// }

// @dev: use only when debugging
const DEFAULT_FORM_DATA: Partial<FormData> = {
  currencyCode: "USD",
  //tokenId: "1-evm-native",
  tokenId: "polkadot-substrate-native",
  amount: 100,
}

export const useRampBuyForm = () => {
  const { t } = useTranslation()
  const refQuote = useRef<RampBuyQuote | null>(null)

  const form = useForm({
    defaultValues: DEFAULT_FORM_DATA,
    onSubmit: async ({ value }) => {
      try {
        const quote = refQuote.current
        if (!quote) throw new Error("No quote")
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
  const { currencies } = useRampBuyCurrencies()
  const { tokens } = useRampBuyTokens(formData.currencyCode)
  const { data: tokenRates, isLoading: isLoadingTokenRates } = useSpecificTokenRates(tokens)

  const [amount, setAmount] = useState<number | undefined>()
  useDebounce(() => setAmount(formData.amount), 250, [formData.amount])

  const quoteConfig = useMemo(() => {
    if (!amount || !formData.currencyCode || !formData.tokenId) return null
    return { currencyCode: formData.currencyCode, amount, tokenId: formData.tokenId }
  }, [amount, formData.currencyCode, formData.tokenId])

  const quotes = useRampBuyQuotes(quoteConfig)

  const token = useToken(formData.tokenId)
  const chain = useChain(token?.chain?.id)
  const allAccounts = useAccounts()

  const accounts = useMemo(
    () =>
      allAccounts.filter((account) => {
        if (isEvmToken(token)) return isAccountEthereum(account)
        if (isSubToken(token) && chain) return isAccountCompatibleWithChain(chain, account)
        return false
      }),
    [allAccounts, chain, token],
  )

  // clear provider choice if the token or currency change
  useEffect(() => {
    form.resetField("provider")

    // @dev: make sure quoteConfig?.tokenId, formData.currencyCode are dependencies in the array below
  }, [quoteConfig?.tokenId, formData.currencyCode, form])

  // select best provider once quotes are ready
  useEffect(() => {
    if (!formData.provider && quotes.every((q) => !q.quote.isLoading)) {
      const bestQuote = quotes
        .filter((q) => q.quote.data?.amountOut)
        .sort((a, b) => Number(b.quote.data!.amountOut) - Number(a.quote.data!.amountOut))[0]
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
    refQuote.current = providerQuote?.quote?.data ?? null
  }, [formData.provider, quotes])

  return {
    form,
    currencies,
    tokenRates,
    isLoadingTokenRates,
    quoteConfig,
    quotes,
    tokens,
    formData,
    accounts,
  }
}

const redirectToProvider = async (formData: FormData, quote: RampBuyQuote) => {
  let address = formData.account

  const token = await chaindataProvider.tokenById(formData.tokenId)
  if (token?.chain?.id) {
    const chain = await chaindataProvider.chainById(token.chain.id)
    if (typeof chain?.prefix === "number") address = encodeAddressSs58(address, chain.prefix)
  }

  const url = await quote.getRedirectUrl(address)

  window.open(url, "_blank", "noopener noreferrer")
}
