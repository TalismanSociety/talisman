import { web3AccountsSubscribe, web3Enable } from "@polkadot/extension-dapp"
import { useAllAddresses, useBalances, useTokens } from "@talismn/balances-react"
import { Token } from "@talismn/chaindata-provider"
import { classNames, formatDecimals } from "@talismn/util"
import { Fragment, useEffect, useMemo, useState } from "react"
import tinycolor from "tinycolor2"

export function App(): JSX.Element {
  const addresses = useExtensionAddresses()
  const [, setAllAddresses] = useAllAddresses()
  useEffect(() => setAllAddresses(addresses ?? []), [addresses, setAllAddresses])

  const tokens = useTokens()
  const tokenIds = useMemo(() => Object.values(tokens).map(({ id }) => id), [tokens])

  const addressesByToken = useAddressesByToken(addresses, tokenIds)
  const balances = useBalances(addressesByToken)

  return (
    <div className="m-5 flex flex-col gap-5">
      <h1 className="text-lg">Balances Demo</h1>

      <div className="text-lg font-bold">
        {balances.count > 0 &&
          ((balances.sum.fiat("usd").total ?? 0).toLocaleString(undefined, {
            style: "currency",
            currency: "USD",
            currencyDisplay: "narrowSymbol",
          }) ??
            "-")}
      </div>

      {/* Display balances per balance (so, per token per account) */}
      <div className="grid grid-cols-[repeat(6,_auto)] items-center gap-x-4 gap-y-2">
        {balances?.sorted.map((balance) =>
          balance.total.planck === BigInt("0") ? null : (
            <Fragment key={balance.id}>
              <img
                className="h-12 w-12 max-w-none justify-self-center"
                alt="token logo"
                src={balance.token?.logo}
              />

              <span>
                <span
                  className={classNames(
                    "rounded-sm p-2 text-center",
                    tinycolor(balance.token?.themeColor).getLuminance() >= 0.6
                      ? "text-body-black"
                      : ""
                  )}
                  style={{ background: balance.token?.themeColor }}
                >
                  {balance.token?.themeColor}
                </span>
              </span>

              <span>{balance.status}</span>

              <span>
                <span
                  className={classNames(
                    "min-w-[6rem] overflow-hidden overflow-ellipsis whitespace-nowrap rounded-sm p-2 text-center",
                    tinycolor(
                      balance.chain?.themeColor || balance.evmNetwork?.themeColor
                    ).getLuminance() >= 0.6
                      ? "text-body-black"
                      : ""
                  )}
                  style={{
                    background: balance.chain?.themeColor || balance.evmNetwork?.themeColor,
                  }}
                >
                  {balance.chain?.name || balance.evmNetwork?.name}
                </span>
              </span>

              <span className="flex flex-col whitespace-nowrap">
                <span className="whitespace-nowrap">
                  {formatDecimals(balance.transferable.tokens)} {balance.token?.symbol}
                </span>
                <span className="text-xs opacity-60">
                  {typeof balance.transferable.fiat("usd") === "number"
                    ? new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: "usd",
                        currencyDisplay: "narrowSymbol",
                      }).format(balance.transferable.fiat("usd") || 0)
                    : " -"}
                </span>
              </span>

              <span className="overflow-hidden overflow-ellipsis">{balance.address}</span>
            </Fragment>
          )
        )}
      </div>
    </div>
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
