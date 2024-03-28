import { useCallback, useRef, useState } from "react"
import { erc721Abi } from "viem"
import { useAccount, useContractRead, usePublicClient, useWalletClient } from "wagmi"

import { useDeployment } from "../../../contracts"
import { useErc721Contract } from "./context"

export const ERC721ContractSelect = () => {
  const { isConnected, address: account, chain } = useAccount()

  const [address, setAddress] = useErc721Contract()

  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const { bytecode } = useDeployment("TestERC721", chain?.id ?? 0)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployError, setDeployError] = useState<Error>()
  const refInput = useRef<HTMLInputElement>(null)

  const handleDeploy = useCallback(async () => {
    setIsDeploying(true)
    setDeployError(undefined)
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
      if (refInput.current) refInput.current.value = receipt.contractAddress
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("handleDeploy", { err })
      setDeployError(err as Error)
    }
    setIsDeploying(false)
  }, [bytecode, publicClient, setAddress, walletClient])

  const { data: symbol, error: errorSymbol } = useContractRead({
    address: address as `0x${string}`,
    abi: erc721Abi,
    functionName: "symbol",
    query: { enabled: !!address },
  })

  const { data: balance, error: errorBalance } = useContractRead({
    address: address as `0x${string}`,
    abi: erc721Abi,
    functionName: "balanceOf",
    args: [account as `0x${string}`],
    query: { enabled: isConnected && !!account },
  })

  if (!chain || !isConnected) return null

  const error = errorSymbol ?? errorBalance ?? deployError

  return (
    <form className="text-body-secondary">
      <h3 className="text-body text-lg">ERC721 Token</h3>
      <div className="flex items-center">
        <label className="w-48" htmlFor="send-tokens-amount">
          Contract :
        </label>
        <input
          ref={refInput}
          id="erc20-contract-address"
          defaultValue={address}
          type="text"
          spellCheck={false}
          autoComplete="off"
          className="h-12 w-[42rem] font-mono text-sm"
          onChange={(e) => setAddress(e.target.value)}
        />
        <div className="ml-4">
          {!address &&
            (isDeploying ? (
              "Deploying..."
            ) : (
              <button className="text-grey-300 hover:text-body underline" onClick={handleDeploy}>
                Deploy
              </button>
            ))}
        </div>
      </div>
      <div className="flex h-12 items-center">
        <div className="w-48">Balance :</div>
        <div>{balance ? `${balance.toString()} ${symbol}` : "N/A"}</div>
      </div>
      {!!error && <div className="text-alert-error">{error.toString()}</div>}
    </form>
  )
}
