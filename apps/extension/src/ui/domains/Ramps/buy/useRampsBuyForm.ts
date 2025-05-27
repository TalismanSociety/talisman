import { encodeAddressSs58, isAddressEqual } from "@talismn/crypto"
import { isTruthy } from "@talismn/util"
import { useForm, useStore } from "@tanstack/react-form"
import {
  activeChainsStore,
  activeEvmNetworksStore,
  activeTokensStore,
  isAccountCompatibleWithChain,
  isAccountPlatformEthereum,
} from "extension-core"
import { chaindataProvider } from "extension-core/src/rpcs/chaindata"
import { log } from "extension-shared"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useDebounce } from "react-use"
import { firstValueFrom } from "rxjs"
import { z } from "zod"

import { notify } from "@talisman/components/Notifications"
import { useSpecificTokenRates } from "@ui/hooks/useSpecificTokenRates"
import { getToken$, useAccounts, useChain, useToken } from "@ui/state"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"

import { RampsFormSharedData } from "../shared/types"
import { RampsBuyQuote, RampsBuyQuoteSuccess } from "./types"
import { useRampsBuyCurrencies } from "./useRampsBuyCurrencies"
import { useRampsBuyQuotes } from "./useRampsBuyQuotes"
import { useRampsBuyTokens } from "./useRampsBuyTokens"

const schema = z.object({
  currencyCode: z.string().nonempty(),
  tokenId: z.string().nonempty(),
  amount: z.number().gt(0),
  provider: z.enum(["coinbase", "ramp"]),
  account: z.string().nonempty(),
})

type FormData = z.infer<typeof schema>

export const useRampsBuyForm = (defaults: RampsFormSharedData) => {
  const { t } = useTranslation()
  const refQuote = useRef<RampsBuyQuote | null>(null)

  const form = useForm({
    defaultValues: defaults as Partial<FormData>,
    onSubmit: async ({ value }) => {
      try {
        const quote = refQuote.current
        if (!quote || quote.type === "error") throw new Error("No quote")
        const formData = schema.parse(value)

        await ensureTokenEnabled(formData.tokenId)

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
  const { currencies } = useRampsBuyCurrencies()
  const { tokens } = useRampsBuyTokens(formData.currencyCode)
  const { data: tokenRates, isLoading: isLoadingTokenRates } = useSpecificTokenRates(tokens)

  const [amount, setAmount] = useState<number | undefined>()
  useDebounce(() => setAmount(formData.amount), 250, [formData.amount])

  const quoteOpts = useMemo(() => {
    if (!amount || !formData.currencyCode || !formData.tokenId) return null
    return { currencyCode: formData.currencyCode, amount, tokenId: formData.tokenId }
  }, [amount, formData.currencyCode, formData.tokenId])

  const quotes = useRampsBuyQuotes(quoteOpts)

  const token = useToken(formData.tokenId)
  const chain = useChain(token?.chain?.id)
  const allAccounts = useAccounts("portfolio")

  const accounts = useMemo(
    () =>
      allAccounts.filter((account) => {
        if (isEvmToken(token)) return isAccountPlatformEthereum(account)
        if (isSubToken(token) && chain) return isAccountCompatibleWithChain(chain, account)
        return false
      }),
    [allAccounts, chain, token],
  )

  // clear provider choice if the token or currency change
  useEffect(() => {
    form.resetField("provider")

    // @dev: make sure quoteOpts?.tokenId, formData.currencyCode are dependencies in the array below
  }, [quoteOpts?.tokenId, formData.currencyCode, form])

  // select best provider once quotes are ready
  useEffect(() => {
    if (!formData.provider && quotes.every((q) => !q.query.isLoading)) {
      const getAmountOut = (q: RampsBuyQuote | null | undefined) =>
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

const redirectToProvider = async (formData: FormData, quote: RampsBuyQuoteSuccess) => {
  let address = formData.account

  const token = await chaindataProvider.tokenById(formData.tokenId)
  if (token?.chain?.id) {
    const chain = await chaindataProvider.chainById(token.chain.id)
    if (typeof chain?.prefix === "number") address = encodeAddressSs58(address, chain.prefix)
  }

  const url = await quote.getRedirectUrl(address)

  window.open(url, "_blank", "noopener noreferrer")
}

const ensureTokenEnabled = async (tokenId: string) => {
  const token = await firstValueFrom(getToken$(tokenId))
  if (!token) return

  await activeTokensStore.setActive(tokenId, true)

  if (isEvmToken(token) && token.evmNetwork?.id)
    await activeEvmNetworksStore.setActive(token.evmNetwork.id, true)
  else if (isSubToken(token) && token.chain?.id)
    await activeChainsStore.setActive(token.chain.id, true)
}
