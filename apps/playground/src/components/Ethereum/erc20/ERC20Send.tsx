import { useCallback } from "react"
import { useForm } from "react-hook-form"
import { useLocalStorage } from "react-use"
import { Button } from "talisman-ui"
import { parseUnits } from "viem"
import {
  erc20ABI,
  useAccount,
  useContractRead,
  useContractWrite,
  usePrepareContractWrite,
  useWalletClient,
} from "wagmi"

import { TransactionReceipt } from "../shared/TransactionReceipt"
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

  const { data: decimals = 18 } = useContractRead({
    address: contractAddress as `0x${string}`,
    abi: erc20ABI,
    functionName: "decimals",
    enabled: !!contractAddress,
  })

  const { data: balanceOfSelfData } = useContractRead({
    address: contractAddress as `0x${string}`,
    abi: erc20ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    enabled: !!contractAddress && !!address,
    watch: true,
  })

  const { config, isSuccess: prepIsSuccess } = usePrepareContractWrite({
    address: contractAddress as `0x${string}`,
    abi: erc20ABI,
    functionName: "transfer",
    enabled: !!contractAddress && !!balanceOfSelfData,
    args: [formData.recipient as `0x${string}`, parseUnits(formData.amount, decimals)],
  })

  const {
    isLoading: writeIsLoading,
    write: send,
    error: sendError,
    isLoading: sendIsLoading,
    isSuccess: sendIsSuccess,
    isError: sendIsError,
    data: senddata,
  } = useContractWrite(config)

  const onSubmit = (data: FormData) => {
    setDefaultValues(data)
    send?.()
  }

  // allows testing an impossible contract interaction (transfer more than you have to test)
  const handleSendUnchecked = useCallback(async () => {
    if (!walletClient) return

    walletClient.writeContract({
      address: contractAddress as `0x${string}`,
      abi: erc20ABI,
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
              <pre className="text-alert-success my-8 ">
                Transaction: {JSON.stringify(senddata, undefined, 2)}
              </pre>
            )}
            {sendIsError && (
              <div className="text-alert-error my-8 ">Error : {sendError?.message}</div>
            )}
            <TransactionReceipt hash={senddata?.hash} />
          </form>
        </>
      ) : (
        <div className="text-body-secondary">Contract address isn't valid</div>
      )}
    </div>
  )
}
