import { web3AccountsSubscribe, web3Enable } from "@polkadot/extension-dapp"
import { EvmErc20Module } from "@talismn/balances-evm-erc20"
import { EvmNativeModule } from "@talismn/balances-evm-native"
import { useBalances, useChaindata, useTokens } from "@talismn/balances-react"
import { SubNativeModule } from "@talismn/balances-substrate-native"
import { SubOrmlModule } from "@talismn/balances-substrate-orml"
import { Token } from "@talismn/chaindata-provider"
import { useEffect, useMemo, useState } from "react"

const balanceModules = [SubNativeModule, SubOrmlModule, EvmNativeModule, EvmErc20Module]

export function App(): JSX.Element {
  const chaindata = useChaindata()
  const addresses = useExtensionAddresses()

  const tokens = useTokens(chaindata)
  const tokenIds = useMemo(() => Object.keys(tokens), [tokens])

  const addressesByToken = useAddressesByToken(addresses, tokenIds)
  const balances = useBalances(balanceModules, chaindata, addressesByToken)

  return (
    <>
      <h2>Balances Demo</h2>
      {balances?.sorted.map((balance) => (
        <div key={balance.id} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <img src={balance.token?.logo} style={{ height: "2rem", borderRadius: "9999999rem" }} />
          <img
            src={balance.chain?.logo || undefined}
            style={{ height: "2rem", borderRadius: "9999999rem" }}
          />
          <span>{balance.chain?.name}</span>
          <span>{balance.transferable.tokens}</span>
          <span>{balance.token?.symbol}</span>
          <span>{balance.address}</span>
        </div>
      ))}
      <pre>{JSON.stringify({ addresses, tokenIds, balances }, null, 2)}</pre>
    </>
  )
}

/**
 * Connects to the web3 provider (e.g. talisman) and subscribes to the list of account addresses.
 */
function useExtensionAddresses() {
  // some state to store the list of addresses which we plan to fetch from the extension
  const [addresses, setAddresses] = useState<string[] | null>(null)

  useEffect(() => {
    const unsubscribePromise = (async () => {
      // connect to the extension
      await web3Enable("balances-demo")

      // subscribe to the list of accounts from the extension
      const unsubscribe = await web3AccountsSubscribe((accounts) => {
        // convert the list of accounts into a list of account addresses
        const addresses = accounts.map((account) => account.address)

        // provide the list of account addresses to the caller of this hook
        setAddresses(addresses)
      })

      // return the unsubscribe callback, which we can retrieve later with `unsubscribePromise.then`
      return unsubscribe
    })()

    // when our hook is unmounted, we want to unsubscribe from the list of accounts from the extension
    return () => {
      // unsubscribePromise is just a Promise, we call `.then` to retrieve the inner unsubscribe callback
      unsubscribePromise.then((unsubscribe) => {
        // this is where we actually unsubscribe
        unsubscribe()
      })
    }
  }, [])

  // provide the list of account addresses to the caller of this hook
  return addresses
}

/**
 * Given an array of `addresses` and an array of `tokenIds`, will return an `addressesByToken` map like so:
 *
 *     {
 *       [tokenIdOne]: [addressOne, addressTwo, etc]
 *       [tokenIdTwo]: [addressOne, addressTwo, etc]
 *       [etc]:        [addressOne, addressTwo, etc]
 *     }
 */
function useAddressesByToken(addresses: string[] | null, tokenIds: Token["id"][]) {
  return useMemo(() => {
    if (addresses === null) return {}
    return Object.fromEntries(tokenIds.map((tokenId) => [tokenId, addresses]))
  }, [addresses, tokenIds])
}
