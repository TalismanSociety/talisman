import { Button } from "talisman-ui"
import { useAccount, useBalance, useConnect, useDisconnect, useNetwork } from "wagmi"
import { Section } from "./Section"

export const Connect = () => {
  const { address, isConnected, connector } = useAccount()
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect()
  const { chain, chains } = useNetwork()
  const { data: balance } = useBalance({
    chainId: chain?.id,
    addressOrName: address,
    enabled: !!address && !!chain,
  })
  const { disconnect } = useDisconnect()

  return (
    <Section>
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
