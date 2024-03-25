import { useCallback } from "react"
import { useForm } from "react-hook-form"
import { useLocalStorage } from "react-use"
import { Button } from "talisman-ui"
import { erc20Abi, parseUnits } from "viem"
import {
  useAccount,
  useReadContract,
  useSimulateContract,
  useWalletClient,
  useWriteContract,
} from "wagmi"

import { TransactionReceipt } from "../shared/TransactionReceipt"
import { useInvalidateQueries } from "../shared/useInvalidateQueries"
import { useErc20Contract } from "./context"

type FormData = { recipient: string; amount: string }

const DEFAULT_VALUE: FormData = {
  recipient: "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67",
  amount: "0.001",
}

export const ERC20Send = () => {
  const { isConnected, address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [contractAddress] = useErc20Contract()
  const [defaultValues, setDefaultValues] = useLocalStorage("pg:send-erc20", DEFAULT_VALUE)

  const {
    register,
    handleSubmit,
    watch,
    formState: { isValid, isSubmitting },
  } = useForm<FormData>({
    defaultValues,
  })

  const formData = watch()

  const { data: decimals = 18, queryKey: qk1 } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: !!contractAddress },
  })
  useInvalidateQueries(qk1)

  const { data: balanceOfSelfData, queryKey: qk2 } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !!contractAddress && !!address },
  })
  useInvalidateQueries(qk2)

  const {
    data: transferData,
    isSuccess: prepIsSuccess,
    queryKey: qk3,
  } = useSimulateContract({
    address: contractAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "transfer",
    query: { enabled: !!contractAddress && !!balanceOfSelfData },
    args: [formData.recipient as `0x${string}`, parseUnits(formData.amount, decimals)],
  })
  useInvalidateQueries(qk3)

  const {
    isLoading: writeIsLoading,
    writeContract: send,
    error: sendError,
    isLoading: sendIsLoading,
    isSuccess: sendIsSuccess,
    isError: sendIsError,
    data: hash,
  } = useWriteContract()

  const onSubmit = (data: FormData) => {
    setDefaultValues(data)
    send?.(transferData!.request)
  }

  // allows testing an impossible contract interaction (transfer more than you have to test)
  const handleSendUnchecked = useCallback(async () => {
    if (!walletClient) return

    walletClient.writeContract({
      address: contractAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "transfer",
      args: [formData.recipient as `0x${string}`, parseUnits(formData.amount, decimals)],
    })
  }, [contractAddress, decimals, formData.amount, formData.recipient, walletClient])

  if (!isConnected) return null

  return (
    <div className="mt-8">
      <h3 className="text-lg">Send</h3>
      {contractAddress ? (
        <>
          <form className="text-body-secondary space-y-1 " onSubmit={handleSubmit(onSubmit)}>
            <div className="flex items-center">
              <label className="w-48" htmlFor="send-tokens-to">
                Recipient :
              </label>
              <input
                className="h-12 w-[42rem] font-mono text-sm"
                id="send-tokens-to"
                type="text"
                autoComplete="off"
                spellCheck={false}
                {...register("recipient", { required: true })}
              />
            </div>
            <div className="flex items-center">
              <label className="w-48" htmlFor="send-tokens-amount">
                Amount :
              </label>
              <input
                id="send-tokens-amount"
                type="text"
                spellCheck={false}
                autoComplete="off"
                className="h-12 w-[42rem] font-mono text-sm"
                {...register("amount", { required: true })}
              />
            </div>
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                processing={sendIsLoading}
                disabled={!isValid || isSubmitting || !prepIsSuccess}
                small
              >
                Send
              </Button>
              <Button
                type="button"
                processing={writeIsLoading}
                disabled={!isValid || isSubmitting}
                onClick={handleSendUnchecked}
                small
              >
                Send (unchecked)
              </Button>
            </div>
            {sendIsSuccess && (
              <>
                <pre className="text-alert-success my-8 ">
                  Transaction: {JSON.stringify(hash, undefined, 2)}
                </pre>
                <TransactionReceipt hash={hash} />
              </>
            )}
            {sendIsError && (
              <div className="text-alert-error my-8 ">Error : {sendError?.message}</div>
            )}
          </form>
        </>
      ) : (
        <div className="text-body-secondary">Contract address isn't valid</div>
      )}
    </div>
  )
}
