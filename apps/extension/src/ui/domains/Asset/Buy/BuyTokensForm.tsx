import { DEBUG } from "@core/constants"
import { AccountJsonAny } from "@core/domains/accounts/types"
import { Token } from "@core/domains/tokens/types"
import { encodeAnyAddress } from "@core/util"
import { yupResolver } from "@hookform/resolvers/yup"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { Dropdown, RenderItemFunc } from "@talisman/components/Dropdown"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import Account from "@ui/domains/Account"
import useAccounts from "@ui/hooks/useAccounts"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import useChains from "@ui/hooks/useChains"
import useTokens from "@ui/hooks/useTokens"
import { useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import styled from "styled-components"
import * as yup from "yup"

import { TokenAmountField } from "../TokenAmountField"

const Form = styled.form`
  padding-top: 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
`

const AccountDropDown = styled(Dropdown)<AccountJsonAny>`
  z-index: 1;
  display: block;

  button {
    width: 100%;
    height: 56px;
    padding: 0 1.6rem;
    align-items: center;
    > span,
    > span * {
      max-height: none;
    }

    .account-name > .text > .account-name-row .copy {
      display: none;
    }

    > span + span > svg {
      font-size: 2.4rem;
    }
    .copy {
      display: none;
    }
  }

  > ul {
    top: 5.2rem;

    > li {
      padding: 0.8rem 1.6rem;
      opacity: 0.8;

      .account-name > .text > .account-name-row {
        //color: var(--color-background-muted-2x);
        color: var(--color-mid);
        opacity: 0.8;
      }

      &[aria-selected="true"] {
        opacity: 1;
        background-color: #333333;
        .account-name > .text > .account-name-row {
          opacity: 1;
        }
      }
    }
  }
`

const Button = styled(SimpleButton)`
  width: 100%;
  font-size: 1.8rem;
  height: 5.6rem;

  :disabled {
    background: var(--color-background-muted-3x);
    color: var(--color-background-muted-2x);
    opacity: 1;
  }
`

const Caption = styled.div`
  color: var(--color-background-muted-2x);
  font-size: 1.2rem;
  line-height: 1.2rem;
  font-weight: 500;
`

const renderAccountItem: RenderItemFunc<AccountJsonAny> = (account, key) => {
  return <Account.Name withAvatar address={account?.address} />
}

const TOKENS_ETH = ["moonbeam-native-glmr", "moonriver-native-movr", "1-native-eth"]
const TOKENS_SUBSTRATE = ["astar-native-astr", "polkadot-native-dot", "kusama-native-ksm"]
const BANXA_URL = DEBUG ? "https://talisman.banxa-sandbox.com/" : "https://talisman.banxa.com/"

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

export const BuyTokensForm = () => {
  useAnalyticsPageView(ANALYTICS_PAGE)
  const accounts = useAccounts()

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
  const tokens = useTokens()
  const chains = useChains()

  const submit = useCallback(
    async (formData: FormData) => {
      if (!formData.tokenId) throw new Error("Token not found")
      if (!formData.address) throw new Error("Address not found")

      const account = accounts.find(({ address }) => address === formData.address)
      if (!account) throw new Error("Account not found")

      const token = tokens?.find(({ id }) => id === formData.tokenId)
      if (!token) throw new Error("Token not found")

      const chain = chains?.find(({ id }) => id === (token.chain?.id as string))
      const isEthereum = isEthereumAddress(account.address)
      if (!isEthereum && !chain) throw new Error("Chain not found")

      const walletAddress = isEthereum
        ? account.address
        : encodeAnyAddress(account.address, chain?.prefix ?? undefined)

      const qs = new URLSearchParams({
        walletAddress,
        coinType: token?.symbol,
        fiatAmount: String(formData.amountUSD),
        fiatType: "USD",
        walletAddressTag: account.name ?? "Talisman",
      })

      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "GotoExternal",
        action: "Continue button - go to Banxa",
      })

      const redirectUrl = `${BANXA_URL}?${qs}`
      window.open(redirectUrl, "_blank")
    },
    [accounts, chains, tokens]
  )

  const handleAccountChange = useCallback(
    (acc: AccountJsonAny) => {
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Interact",
        action: "Account selection",
        properties: {
          accountType: isEthereumAddress(acc.address) ? "Ethereum" : "Substrate",
        },
      })

      if (tokenId && TOKENS_ETH.includes(tokenId) && !isEthereumAddress(acc.address))
        setValue("tokenId", "")
      if (tokenId && TOKENS_SUBSTRATE.includes(tokenId) && isEthereumAddress(acc.address))
        setValue("tokenId", "")

      setValue("address", acc?.address, { shouldValidate: true })
    },
    [setValue, tokenId]
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
      if (TOKENS_ETH.includes(tokenId) && (!address || !isEthereumAddress(address))) {
        const acc = accounts.find((acc) => isEthereumAddress(acc.address))
        setValue("address", acc?.address ?? "")
      }
      if (TOKENS_SUBSTRATE.includes(tokenId) && (!address || isEthereumAddress(address))) {
        const acc = accounts.find((acc) => !isEthereumAddress(acc.address))
        setValue("address", acc?.address ?? "")
      }

      setValue("tokenId", tokenId, { shouldValidate: true })
    },
    [accounts, address, setValue]
  )

  const filterTokens = useCallback(
    (token: Token) => {
      if (!address) return [...TOKENS_ETH, ...TOKENS_SUBSTRATE].includes(token.id)
      const allowedTokens = isEthereumAddress(address) ? TOKENS_ETH : TOKENS_SUBSTRATE
      return allowedTokens.includes(token.id)
    },
    [address]
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
    <Form onSubmit={handleSubmit(submit)}>
      <AccountDropDown
        items={accounts as AccountJsonAny[]}
        propertyKey="address"
        renderItem={renderAccountItem}
        onChange={handleAccountChange}
        placeholder="Select Account"
        defaultSelectedItem={selectedAccount}
        key={address} // uncontrolled component, will reset if value changes
      />
      <TokenAmountField
        fieldProps={register("amountUSD")}
        prefix="$"
        onTokenChanged={handleTokenChanged}
        onTokenButtonClick={handleTokenButtonClick}
        tokensFilter={filterTokens}
        tokenId={tokenId}
      />
      <Button type="submit" primary disabled={!isValid}>
        Continue
      </Button>
      <Caption>You will be taken to Banxa to complete this transaction</Caption>
    </Form>
  )
}
