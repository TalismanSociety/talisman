import { ethers } from "ethers"
import { formatUnits } from "ethers/lib/utils.js"
import { useCallback, useRef, useState } from "react"
import { erc20ABI, useAccount, useContractRead, useNetwork } from "wagmi"

import { useDeployment } from "../../../contracts"
import { useErc20Contract } from "./context"

export const ERC20ContractSelect = () => {
  const { chain } = useNetwork()
  const { isConnected, address: account, connector } = useAccount()

  const [address, setAddress] = useErc20Contract()

  const { bytecode } = useDeployment("TestERC20", chain?.id ?? 0)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployError, setDeployError] = useState<Error>()
  const refInput = useRef<HTMLInputElement>(null)

  const handleDeploy = useCallback(async () => {
    setIsDeploying(true)
    setDeployError(undefined)
    try {
      const provider = await connector?.getProvider()
      if (!provider || !chain) return

      const web3Provider = new ethers.providers.Web3Provider(provider)
      const transaction: ethers.providers.TransactionRequest = {
        from: account,
        data: bytecode,
        chainId: chain.id,
      }

      const txHash = await web3Provider.send("eth_sendTransaction", [transaction])
      const receipt = await web3Provider.waitForTransaction(txHash)
      if (!receipt.contractAddress) throw new Error("No contract address in receipt")

      setAddress(receipt.contractAddress as `0x${string}`)
      if (refInput.current) refInput.current.value = receipt.contractAddress
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("handleDeploy", { err })
      setDeployError(err as Error)
    }
    setIsDeploying(false)
  }, [account, bytecode, chain, connector, setAddress])

  const { data: symbol, error: errorSymbol } = useContractRead({
    address: address as `0x${string}`,
    abi: erc20ABI,
    functionName: "symbol",
    enabled: !!address,
  })

  const { data: decimals, error: errorDecimals } = useContractRead({
    address: address as `0x${string}`,
    abi: erc20ABI,
    functionName: "decimals",
    enabled: !!address,
  })

  const { data: balance, error: errorBalance } = useContractRead({
    address: address as `0x${string}`,
    abi: erc20ABI,
    functionName: "balanceOf",
    args: [account as `0x${string}`],
    enabled: isConnected && !!account,
  })

  if (!chain || !isConnected) return null

  const error = errorSymbol ?? errorDecimals ?? errorBalance ?? deployError

  return (
    <form className="text-body-secondary">
      <h3 className="text-body text-lg">ERC20 Token</h3>
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
        <div className="w-48">Decimals :</div>
        <div>{decimals}</div>
      </div>
      <div className="flex h-12 items-center">
        <div className="w-48">Balance :</div>
        <div>{balance ? `${formatUnits(balance, decimals)} ${symbol}` : "N/A"}</div>
      </div>
      {!!error && <div className="text-alert-error">{error.toString()}</div>}
    </form>
  )
}
