import { ethers } from "ethers"
import { FC, useCallback, useEffect, useState } from "react"
import { useAccount, useNetwork } from "wagmi"

import { PgContractType, useDeployment } from "../../../contracts/deployments"

export const ContractConnect: FC<{ contract: PgContractType }> = ({ contract }) => {
  const { connector, address: from } = useAccount()
  const { chain } = useNetwork()
  const { address, setAddress, bytecode, forgetAddress } = useDeployment(contract, chain?.id ?? 0)
  const [isDeploying, setIsDeploying] = useState(false)
  const [error, setError] = useState<Error>()

  useEffect(() => {
    setIsDeploying(false)
    setError(undefined)
  }, [contract, chain?.id])

  const handleDeploy = useCallback(async () => {
    setIsDeploying(true)
    setError(undefined)
    try {
      const provider = await connector?.getProvider()
      if (!provider || !chain) return

      const web3Provider = new ethers.providers.Web3Provider(provider)
      const transaction: ethers.providers.TransactionRequest = {
        from,
        data: bytecode,
        chainId: chain.id,
      }

      const txHash = await web3Provider.send("eth_sendTransaction", [transaction])

      const receipt = await web3Provider.waitForTransaction(txHash)

      if (!receipt.contractAddress) throw new Error("No contract address in receipt")

      setAddress(receipt.contractAddress as `0x${string}`)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("handleDeploy", { err })
      setError(err as Error)
    }
    setIsDeploying(false)
  }, [bytecode, chain, connector, from, setAddress])

  if (!chain) return <div>Disconnected</div>

  return (
    <div>
      <div>
        Address :{" "}
        <span className="font-mono">
          {address ??
            (isDeploying ? (
              "Deploying..."
            ) : (
              <button className="text-grey-300 hover:text-body underline" onClick={handleDeploy}>
                Deploy
              </button>
            ))}
        </span>
      </div>
      {error && <pre className="text-alert-error p-2">{error?.toString()}</pre>}
      {address && (
        <button className="text-grey-300 hover:text-body underline" onClick={forgetAddress}>
          Forget address
        </button>
      )}
    </div>
  )
}
