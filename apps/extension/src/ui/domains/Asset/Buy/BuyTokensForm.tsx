import { BANXA_URL, DEBUG } from "@core/constants"
import { AccountJsonAny } from "@core/domains/accounts/types"
import { Chain } from "@core/domains/chains/types"
import { Token } from "@core/domains/tokens/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { githubChaindataBaseUrl } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/util"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { FormattedAddress } from "@ui/domains/Account/FormattedAddress"
import useAccounts from "@ui/hooks/useAccounts"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import useChains from "@ui/hooks/useChains"
import useTokens from "@ui/hooks/useTokens"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, Dropdown, DropdownOptionRender } from "talisman-ui"
import * as yup from "yup"

import { TokenAmountField } from "../TokenAmountField"
import { useBuyTokensModal } from "./BuyTokensModalContext"

// list to keep up to date, it's used when github is unreachable
const DEFAULT_BUY_TOKEN_IDS = [
  // SUB
  "polkadot-substrate-native-dot",
  "kusama-substrate-native-ksm",
  "astar-substrate-native-astr",
  // ETH
  "moonbeam-substrate-native-glmr",
  "moonriver-substrate-native-movr",
  "1-evm-native-eth",
]

type FormData = {
  address: string
  amountUSD: number
  tokenId: string
}

const schema = yup.object({
  address: yup.string().required(""),
  amountUSD: yup.number().required("").min(0),
  tokenId: yup.string().required(""),
})

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Account Funding",
  featureVersion: 1,
  page: "Buy Crypto Modal",
}

const useSupportedTokenIds = (chains?: Chain[], tokens?: Token[], address?: string) => {
  const [supportedTokenIds, setSupportedTokenIds] = useState<string[]>()

  useEffect(() => {
    // pull up to date list from github
    // note that there is a 5min cache on github files
    fetch(`${githubChaindataBaseUrl}/data/tokens-buyable.json`)
      .then(async (response) => {
        const tokenIds: string[] = await response.json()
        setSupportedTokenIds(tokenIds)
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        DEBUG && console.error(err)
        setSupportedTokenIds(DEFAULT_BUY_TOKEN_IDS)
      })
  }, [])

  const supportedTokens = useMemo(
    () => tokens?.filter((t) => supportedTokenIds?.includes(t.id)) ?? [],
    [supportedTokenIds, tokens]
  )

  const { substrateTokenIds, ethereumTokenIds } = useMemo(() => {
    return {
      substrateTokenIds:
        supportedTokens
          ?.filter((t) => {
            if (!["substrate-native"].includes(t.type)) return false
            const chain = chains?.find((c) => c.id === t.chain?.id)
            return chain && chain.account !== "secp256k1"
          })
          .map((t) => t.id) ?? [],
      ethereumTokenIds:
        supportedTokens
          ?.filter((t) => {
            if (!["substrate-native", "evm-native", "evm-erc20"].includes(t.type)) return false
            const chain = chains?.find((c) => c.id === t.chain?.id)
            return !chain || (chain.account === "secp256k1" && chain.evmNetworks.length > 0)
          })
          .map((t) => t.id) ?? [],
    }
  }, [chains, supportedTokens])

  const filterTokens = useCallback(
    (token: Token) => {
      if (!supportedTokenIds) return false
      if (!address) return supportedTokenIds.includes(token.id)
      const allowedTokens = isEthereumAddress(address) ? ethereumTokenIds : substrateTokenIds
      return allowedTokens.includes(token.id)
    },
    [address, ethereumTokenIds, substrateTokenIds, supportedTokenIds]
  )

  return { substrateTokenIds, ethereumTokenIds, filterTokens }
}

const renderAccountItem: DropdownOptionRender<AccountJsonAny> = (account) => {
  return <FormattedAddress address={account.address} withSource className="h-24" />
}

export const BuyTokensForm = () => {
  const [t] = useTranslation()
  useAnalyticsPageView(ANALYTICS_PAGE)
  const { close } = useBuyTokensModal()
  const accounts = useAccounts("portfolio")

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<FormData>({
    mode: "all",
    resolver: yupResolver(schema),
  })

  const [address, tokenId] = watch(["address", "tokenId"])
  const { tokens, tokensMap } = useTokens("enabledWithoutTestnets")
  const { chains, chainsMap } = useChains("enabledWithoutTestnets")

  const { ethereumTokenIds, substrateTokenIds, filterTokens } = useSupportedTokenIds(
    chains,
    tokens,
    address
  )

  const submit = useCallback(
    async (formData: FormData) => {
      if (!formData.tokenId) throw new Error(t("Token not found"))
      if (!formData.address) throw new Error(t("Address not found"))

      const account = accounts.find(({ address }) => address === formData.address)
      if (!account) throw new Error(t("Account not found"))

      const token = tokensMap[formData.tokenId]
      if (!token) throw new Error(t("Token not found"))

      const chain = token.chain?.id ? chainsMap[token.chain?.id] : undefined
      const isEthereum = isEthereumAddress(account.address)
      if (!isEthereum && !chain) throw new Error(t("Chain not found"))

      const walletAddress = isEthereum
        ? account.address
        : encodeAnyAddress(account.address, chain?.prefix ?? undefined)

      const qs = new URLSearchParams({
        walletAddress,
        coinType: token?.symbol,
        fiatAmount: String(formData.amountUSD),
        fiatType: "USD",
      })

      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "GotoExternal",
        action: "Continue button - go to Banxa",
      })

      // close modal before redirect or chrome will keep it visible until user comes back
      close()

      const redirectUrl = `${BANXA_URL}?${qs}`
      window.open(redirectUrl, "_blank")
    },
    [accounts, chainsMap, close, tokensMap, t]
  )

  const handleAccountChange = useCallback(
    (acc: AccountJsonAny | null) => {
      if (!acc) return
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Interact",
        action: "Account selection",
        properties: {
          accountType: isEthereumAddress(acc.address) ? "Ethereum" : "Substrate",
        },
      })

      if (tokenId && ethereumTokenIds.includes(tokenId) && !isEthereumAddress(acc.address))
        setValue("tokenId", "")
      if (tokenId && substrateTokenIds.includes(tokenId) && isEthereumAddress(acc.address))
        setValue("tokenId", "")

      setValue("address", acc?.address, { shouldValidate: true })
    },
    [ethereumTokenIds, setValue, substrateTokenIds, tokenId]
  )

  const handleTokenChanged = useCallback(
    (tokenId: string) => {
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Interact",
        action: "Select Token",
        properties: {
          asset: tokenId,
        },
      })
      if (ethereumTokenIds.includes(tokenId) && (!address || !isEthereumAddress(address))) {
        const acc = accounts.find((acc) => isEthereumAddress(acc.address))
        setValue("address", acc?.address ?? "")
      }
      if (substrateTokenIds.includes(tokenId) && (!address || isEthereumAddress(address))) {
        const acc = accounts.find((acc) => !isEthereumAddress(acc.address))
        setValue("address", acc?.address ?? "")
      }

      setValue("tokenId", tokenId, { shouldValidate: true })
    },
    [accounts, address, ethereumTokenIds, setValue, substrateTokenIds]
  )

  const selectedAccount = useMemo(
    () => accounts.find((acc) => acc.address === address),
    [accounts, address]
  )

  const handleTokenButtonClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Interact",
      action: "Choose Token button",
    })
  }, [])

  return (
    <form className="mt-14 flex flex-col gap-8" onSubmit={handleSubmit(submit)}>
      <Dropdown
        items={accounts as AccountJsonAny[]}
        propertyKey="address"
        renderItem={renderAccountItem}
        onChange={handleAccountChange}
        placeholder={t("Select Account")}
        value={selectedAccount}
        key={address} // uncontrolled component, will reset if value changes
        className="w-full"
        buttonClassName="h-28"
        optionClassName="h-24 py-0"
      />
      <TokenAmountField
        fieldProps={register("amountUSD")}
        prefix="$"
        onTokenChanged={handleTokenChanged}
        onTokenButtonClick={handleTokenButtonClick}
        tokensFilter={filterTokens}
        tokenId={tokenId}
        address={address}
      />
      <Button type="submit" primary disabled={!isValid}>
        {t("Continue")}
      </Button>
      <div className="text-body-disabled text-xs leading-none">
        {t("You will be redirected to Banxa to complete this transaction")}
      </div>
    </form>
  )
}
