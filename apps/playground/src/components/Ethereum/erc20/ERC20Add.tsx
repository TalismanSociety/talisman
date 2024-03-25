import { useCallback, useEffect, useState } from "react"
import { Button } from "talisman-ui"
import { mainnet } from "viem/chains"
import { useAccount, useWalletClient } from "wagmi"

type WatchTokenPayload = {
  address: string
  symbol: string
  decimals: number
  image?: string
}

const PEPE_AS_ARB: WatchTokenPayload = {
  address: "0x6982508145454ce325ddbe47a25d4ec3d2311933",
  symbol: "ARB",
  decimals: 18,
  image:
    "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg?1680097630",
}

const LEGITIMATE_ARB: WatchTokenPayload = {
  address: "0xb50721bcf8d664c30412cfbc6cf7a15145234ad1",
  symbol: "ARB",
  decimals: 18,
  image:
    "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg?1680097630",
}

export const ERC20Add = () => {
  const { isConnected, chain } = useAccount()
  const [output, setOutput] = useState("")

  const { data: walletClient } = useWalletClient()

  useEffect(() => {
    setOutput("")
  }, [])

  const addToken = useCallback(
    (payload: WatchTokenPayload) => async () => {
      setOutput("")
      try {
        if (!walletClient) return

        const result = await walletClient.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: payload,
          },
        })
        setOutput(result.toString())
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log("Error", { err })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setOutput((err as any)?.toString?.() ?? "Error")
      }
    },
    [walletClient]
  )

  if (!isConnected) return null

  return (
    <div className="mt-8">
      <h3 className="text-lg">Send</h3>
      {chain?.id === mainnet.id ? (
        <div className="mt-4 flex gap-8">
          <Button onClick={addToken(LEGITIMATE_ARB)}>Add legitimate ARB</Button>
          <Button onClick={addToken(PEPE_AS_ARB)}>Add PEPE as ARB</Button>
        </div>
      ) : (
        <div>Connect to Ethereum mainnet to test this feature</div>
      )}
      {!!output && <pre className="mt-12">{output}</pre>}
    </div>
  )
}
