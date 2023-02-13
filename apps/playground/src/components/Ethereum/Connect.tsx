import { ChangeEventHandler, useCallback } from "react"
import { Button } from "talisman-ui"
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useNetwork,
  useSwitchNetwork,
} from "wagmi"

import { Section } from "../Section"
import { talismanChains } from "./talismanChains"

export const Connect = () => {
  const { address, isConnected, connector } = useAccount()
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect()
  const { chain } = useNetwork()
  const { data: balance } = useBalance({
    chainId: chain?.id,
    address,
    enabled: !!address && !!chain,
  })
  const { disconnect } = useDisconnect()
  const { switchNetwork } = useSwitchNetwork()

  const handleSwitchNetwork: ChangeEventHandler<HTMLSelectElement> = useCallback(
    (e) => {
      try {
        switchNetwork?.(Number(e.target.value))
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("failed to switch network", err)
      }
    },
    [switchNetwork]
  )

  return (
    <Section title="Connection">
      {isConnected ? (
        <div className="space-y-4">
          <div>Connector : {connector?.name}</div>
          <div>
            Address : <span className="font-mono">{address}</span>
          </div>
          <div>
            Network : {chain?.name ?? "UNKNOWN"} ({chain?.id ?? "N/A"})
          </div>

          <div>Balance : {balance ? `${balance.formatted} ${balance.symbol}` : "UNKNOWN"}</div>

          <div>
            Switch to :{" "}
            <select
              value={"DEFAULT"}
              onChange={handleSwitchNetwork}
              className="bg-grey-700 h-20 rounded-sm p-4 disabled:opacity-50"
              disabled={!connector}
            >
              <option value="DEFAULT">Select</option>
              {talismanChains.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name} ({chain.id})
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => disconnect()}>Disconnect</Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {connectors.map((connector) => (
            <Button
              disabled={!connector.ready}
              key={connector.id}
              onClick={() => connect({ connector })}
              processing={isLoading && connector.id === pendingConnector?.id}
            >
              {connector.name}
              {!connector.ready && " (unsupported)"}
            </Button>
          ))}

          {error && <div>{error.message}</div>}
        </div>
      )}
    </Section>
  )
}
