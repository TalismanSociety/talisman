import { u32 } from "@polkadot/types-codec"
import { useEffect, useState } from "react"

import { Section } from "../../shared/Section"
import { useApi } from "./useApi"
import { useNetwork } from "./useNetwork"

const availableNetworks = {
  "None": undefined,
  "Astar": "wss://astar.api.onfinality.io/public-ws", // "wss://rpc.astar.network",
  "GM": "wss://ws.gm.bldnodes.org",
  "Kusama": "wss://kusama-rpc.polkadot.io", //"wss://kusama.api.onfinality.io/public-ws",
  "Polkadot": "wss://polkadot.api.onfinality.io/public-ws",
  "Local 9944": "ws://localhost:9944",
}

const BlockNumber = () => {
  const { api } = useApi()
  const [blockNumber, setBlockNumber] = useState<number>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error>()

  useEffect(() => {
    if (!api) return
    setIsLoading(true)
    setError(undefined)

    api.query.system
      .number<u32>()
      .then((value) => {
        setBlockNumber(value.toNumber())
        setIsLoading(false)
      })
      .catch(setError)

    const sub = api.rx.query.system.number<u32>().subscribe((next) => {
      try {
        setBlockNumber(next.toNumber())
        setError(undefined)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log({ err })
        setBlockNumber(undefined)
        setError(err as Error)
      }
    })

    return () => {
      sub.unsubscribe()
      setBlockNumber(undefined)
    }
  }, [api])

  return (
    <div>
      BlockNumber :{" "}
      {error ? (
        <span className="text-alert-error">{error?.message ?? "Unknown error"}</span>
      ) : isLoading ? (
        "Loading.children.."
      ) : (
        blockNumber
      )}
    </div>
  )
}

export const Network = () => (
  <Section title="Network">
    <NetworkInner />
  </Section>
)

const NetworkInner = () => {
  const { wsUrl, setWsUrl } = useNetwork()
  const { error, isConnecting } = useApi()

  return (
    <div className="my-8 space-y-4">
      <div>
        Network :{" "}
        <select
          defaultValue={wsUrl ?? "None"}
          className="form-select bg-black-tertiary text-md outline-none"
          onChange={(e) => setWsUrl(e.target.value)}
        >
          {Object.entries(availableNetworks).map(([name, wsUrl]) => (
            <option key={name} value={wsUrl}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div>
        Selected RPC : {wsUrl ?? "N/A"} {isConnecting && "(Connecting...)"}
      </div>
      <div className="text-alert-error">{error && (error as Error).message}</div>
      <BlockNumber />
    </div>
  )
}
