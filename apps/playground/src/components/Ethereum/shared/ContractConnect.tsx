import { FC, useCallback, useEffect, useState } from "react"
import { useAccount, usePublicClient, useWalletClient } from "wagmi"

import { PgContractType, useDeployment } from "../../../contracts/deployments"

export const ContractConnect: FC<{ contract: PgContractType }> = ({ contract }) => {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { chain } = useAccount()
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
      if (!walletClient) throw new Error("No wallet client")
      if (!publicClient) throw new Error("No public client")

      const hash = await walletClient.sendTransaction({
        data: bytecode as `0x${string}`,
      })
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
      })

      if (!receipt.contractAddress) throw new Error("No contract address in receipt")

      setAddress(receipt.contractAddress as `0x${string}`)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("handleDeploy", { err })
      setError(err as Error)
    }
    setIsDeploying(false)
  }, [bytecode, publicClient, setAddress, walletClient])

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
