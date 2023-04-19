import { useCallback, useState } from "react"
import { Button } from "talisman-ui"
import { useAccount } from "wagmi"

import { Section } from "../shared/Section"

const NETWORKS = {
  avalanche: {
    chainId: "0xa86a", // 43114
    chainName: "Avalanche C-Chain",
    nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
    blockExplorerUrls: ["https://snowtrace.io"],
    rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
  },
}

export const AddNetwork = () => {
  const { connector } = useAccount()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error>()
  const [result, setResult] = useState<string>()

  const handleAddNetwork = useCallback(
    (key: keyof typeof NETWORKS) => async () => {
      setError(undefined)
      setResult(undefined)
      setIsPending(true)
      try {
        const provider = await connector?.getProvider()
        await provider.send({
          method: "wallet_addEthereumChain",
          params: [NETWORKS[key]],
        })

        setResult("ok")
      } catch (err) {
        setError(err as Error)
      }
      setIsPending(false)
    },
    [connector]
  )

  if (!connector) return null

  return (
    <Section title="Add Network">
      <div className="space-y-4">
        <div>
          <Button processing={isPending} onClick={handleAddNetwork("avalanche")}>
            Avalanche
          </Button>
        </div>
        {error && <pre className="text-alert-error">{error.toString()}</pre>}
        {result && <pre className="text-alert-success">{JSON.stringify(result, undefined, 2)}</pre>}
      </div>
    </Section>
  )
}
