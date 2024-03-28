import { useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useLocalStorage } from "react-use"
import { Button } from "talisman-ui"
import { Hex, erc20Abi, formatUnits, hexToBigInt, parseUnits } from "viem"
import { useAccount, useReadContract, useSimulateContract, useWriteContract } from "wagmi"

import { TransactionReceipt } from "../shared/TransactionReceipt"
import { useInvalidateQueries } from "../shared/useInvalidateQueries"
import { useErc20Contract } from "./context"

type FormData = { recipient: string; amount: string }

const DEFAULT_VALUE: FormData = {
  recipient: "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67",
  amount: "0.001",
}

const ALLOWANCE_UNLIMITED = hexToBigInt(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
)

export const ERC20Approve = () => {
  const { isConnected, address } = useAccount()
  const [contractAddress] = useErc20Contract()
  const [defaultValues, setDefaultValues] = useLocalStorage("pg:approve-erc20", DEFAULT_VALUE)

  const {
    register,
    handleSubmit,
    watch,
    formState: { isValid, isSubmitting },
  } = useForm<FormData>({
    defaultValues,
  })

  const formData = watch()

  const { data: allowance, queryKey } = useReadContract({
    address: contractAddress as Hex,
    abi: erc20Abi,
    functionName: "allowance",

    args: [address!, formData.recipient as Hex], // owner, spender
    query: { enabled: !!address && !!contractAddress && !!formData.recipient },
  })
  useInvalidateQueries(queryKey)

  const { data: decimals = 18 } = useReadContract({
    address: contractAddress as Hex,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: !!contractAddress },
  })

  const { data: transferData, isSuccess: prepIsSuccess } = useSimulateContract({
    address: contractAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "approve",
    query: { enabled: !!contractAddress },
    args: [
      formData.recipient as `0x${string}`,
      formData.amount === "" ? ALLOWANCE_UNLIMITED : parseUnits(formData.amount, decimals),
    ],
  })

  const {
    writeContract: send,
    error: sendError,
    isLoading: sendIsLoading,
    isSuccess: sendIsSuccess,
    isError: sendIsError,
    data: hash,
  } = useWriteContract()

  const onSubmit = useCallback(() => {
    if (!transferData?.request) return
    setDefaultValues(formData)
    send(transferData.request)
  }, [formData, send, setDefaultValues, transferData?.request])

  const btnLabel = useMemo(() => {
    if (formData.amount === "0") return "Revoke"
    if (formData.amount === "") return "Approve Infinite"
    return "Approve"
  }, [formData.amount])

  if (!isConnected) return null

  return (
    <div className="mt-8">
      <h3 className="text-lg">Approve</h3>
      {contractAddress ? (
        <>
          <form className="text-body-secondary space-y-1 " onSubmit={handleSubmit(onSubmit)}>
            <div className="flex items-center">
              <label className="w-48" htmlFor="send-tokens-to">
                Spender :
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
                {...register("amount", { required: false })}
              />
            </div>
            <div>Set 0 to revoke, or empty value for infinite amount</div>
            <div>
              Current allowance :{" "}
              {allowance === undefined
                ? "N/A"
                : allowance === ALLOWANCE_UNLIMITED
                ? "Infinite"
                : formatUnits(allowance, decimals)}
            </div>
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                processing={sendIsLoading}
                disabled={!isValid || isSubmitting || !prepIsSuccess}
                small
              >
                {btnLabel}
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
