import { web3AccountsSubscribe, web3Enable } from "@polkadot/extension-dapp"
import { BalanceFormatter } from "@talismn/balances"
import { EvmErc20Module } from "@talismn/balances-evm-erc20"
import { EvmNativeModule } from "@talismn/balances-evm-native"
import { useBalances, useChaindata, useTokens } from "@talismn/balances-react"
import { SubNativeModule } from "@talismn/balances-substrate-native"
import { SubOrmlModule } from "@talismn/balances-substrate-orml"
import { Token } from "@talismn/chaindata-provider"
import { formatDecimals } from "@talismn/util"
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

      {/* Display balances per balance (so, per token per account) */}
      {balances?.sorted.map((balance) =>
        balance.total.planck === BigInt("0") ? null : (
          <div key={balance.id} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <img
              alt="token logo"
              src={balance.token?.logo}
              style={{ height: "2rem", borderRadius: "9999999rem" }}
            />

            <span>{balance.status}</span>

            <span>{balance.chain?.name}</span>
            <span>
              {formatDecimals(balance.transferable.tokens)} {balance.token?.symbol}
            </span>
            <span style={{ opacity: "0.6", fontSize: "0.8em" }}>
              ${balance.transferable.fiat("usd") || " -"}
            </span>
            <span>{balance.address}</span>
          </div>
        )
      )}

      {/* Display balances per token */}
      {Object.values(tokens).map((token) => (
        <div key={token.id} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <img
            alt="token logo"
            src={token?.logo}
            style={{ height: "2rem", borderRadius: "9999999rem" }}
          />

          {/* Can't do this yet, alec hasn't implemented it: */}
          {/* <span>{balances?.find({tokenId:token.id}).sum}</span> */}

          {/* So sum it up manually instead: */}
          <span>
            {formatDecimals(
              new BalanceFormatter(
                balances?.find({ tokenId: token.id }).sorted.reduce((sum, balance) => {
                  return sum + balance.transferable.planck
                }, BigInt("0")) || BigInt("0"),
                token.decimals
              ).tokens
            )}{" "}
            {token.symbol}
          </span>

          <span style={{ opacity: "0.6", fontSize: "0.8em" }}>
            ${balances?.find({ tokenId: token.id }).sum.fiat("usd").transferable}
          </span>
        </div>
      ))}
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
