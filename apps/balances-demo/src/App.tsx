import "@talismn/balances-substrate-native"
import "@talismn/balances-substrate-orml"
import "@talismn/balances-evm-native"
import "@talismn/balances-evm-erc20"

import { web3AccountsSubscribe, web3Enable } from "@polkadot/extension-dapp"
import { AddressesByToken, Balances, balances as balancesFn } from "@talismn/balances"
import { ExampleModule } from "@talismn/balances-example"
import { ChainConnector } from "@talismn/chain-connector"
import { ChaindataProvider, Token } from "@talismn/chaindata-provider"
import { ChaindataProviderExtension } from "@talismn/chaindata-provider-extension"
import { useEffect, useState } from "react"

export function App() {
  const addresses = useExtensionAddresses()
  const chainConnector = useChainConnector()

  // NOTE: In prod the tokens list will be fetched in chaindata / in a web worker, not here
  const tokens = useTokens(chainConnector)

  const addressesByToken = useAddressesByToken(addresses, tokens)
  const balances = useBalances(chainConnector, addressesByToken)

  return (
    <>
      <h2>Balances Demo</h2>
      <pre>{JSON.stringify({ addresses, tokens, balances }, null, 2)}</pre>
    </>
  )
}

function useExtensionAddresses() {
  const [addresses, setAddresses] = useState<string[] | null>(null)
  useEffect(() => {
    const pUnsub = (async () => {
      await web3Enable("balances-demo")
      return await web3AccountsSubscribe((accounts) =>
        setAddresses(accounts.map((account) => account.address))
      )
    })()

    return () => {
      pUnsub.then((unsub) => unsub())
    }
  }, [])

  return addresses
}

function useChainConnector() {
  const [chaindataProvider, setChaindataProvider] = useState<ChaindataProvider | null>(null)
  useEffect(() => {
    setChaindataProvider(new ChaindataProviderExtension())
  }, [])

  const [chainConnector, setChainConnector] = useState<ChainConnector | null>(null)
  useEffect(() => {
    if (chaindataProvider === null) return
    setChainConnector(new ChainConnector(chaindataProvider))
  }, [chaindataProvider])

  return chainConnector
}

function useTokens(chainConnector: ChainConnector | null) {
  const [tokens, setTokens] = useState<Token[]>([])
  useEffect(() => {
    if (chainConnector === null) return
    ExampleModule.fetchSubstrateChainTokens(chainConnector, "polkadot").then((tokens) =>
      setTokens(Object.values(tokens))
    )
  }, [chainConnector])

  return tokens
}

function useAddressesByToken(addresses: string[] | null, tokens: Token[]) {
  const [addressesByToken, setAddressesByToken] = useState<AddressesByToken<Token> | null>(null)
  useEffect(() => {
    if (addresses === null) return setAddressesByToken({})
    setAddressesByToken(Object.fromEntries(tokens.map((token) => [token.id, addresses])))
  }, [addresses, tokens])

  return addressesByToken
}

function useBalances(
  chainConnector: ChainConnector | null,
  addressesByToken: AddressesByToken<Token> | null
) {
  const [balances, setBalances] = useState<Balances>()
  useEffect(() => {
    if (chainConnector === null) return
    if (addressesByToken === null) return
    const pUnsub = balancesFn(
      ExampleModule,
      chainConnector,
      addressesByToken,
      (error, balances) => {
        if (error) return console.error(error)
        setBalances(balances)
      }
    )

    return () => {
      pUnsub.then((unsub) => unsub())
    }
  }, [addressesByToken, chainConnector])

  return balances
}
