import {
  useAccount,
  usePrepareSendTransaction,
  useSendTransaction,
  useTransaction,
  useWaitForTransaction,
} from "wagmi"
import { useForm } from "react-hook-form"
import { parseEther } from "ethers/lib/utils"
import { Section } from "./Section"
import { Button } from "talisman-ui"
import { useLocalStorage } from "react-use"
import { useEffect } from "react"

type FormData = { recipient: string; amount: string }

const DEFAULT_VALUE = {
  recipient: "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67",
  amount: "0.001",
}

const TransactionReceipt = ({ hash }: { hash?: string }) => {
  const { data, error, isLoading, isError } = useWaitForTransaction({
    enabled: !!hash,
    hash: hash as `0x${string}`,
  })

  if (!hash) return null

  if (isLoading) return <div>Fetching transaction…</div>
  if (isError) return <div>Error : {error?.message}</div>
  return <pre>Transaction: {JSON.stringify(data, undefined, 2)}</pre>
}

export const SendTokens = () => {
  // const { data, isIdle, isError, isLoading, isSuccess, sendTransaction } = useSendTransaction()
  const { isConnected } = useAccount()
  const [defaultValues, setDefaultValues] = useLocalStorage("pg:send-tokens", DEFAULT_VALUE)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    defaultValues,
  })

  const formData = watch()
  const {
    config,
    error,
    isSuccess: prepIsSuccess,
    status,
  } = usePrepareSendTransaction({
    request: {
      to: formData.recipient,
      value: formData.amount ? parseEther(formData.amount) : undefined,
    },
  })

  const {
    sendTransaction,
    isLoading,
    isIdle,
    isSuccess,
    isError,
    data,
    error: errorSend,
  } = useSendTransaction(config)

  const onSubmit = (data: FormData) => {
    setDefaultValues(data)
    sendTransaction?.()
  }

  if (!isConnected) return null

  return (
    <Section title="Send Tokens">
      <form className="text-md text-body-secondary space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex items-center">
          <label className="w-48" htmlFor="send-tokens-to">
            Recipient
          </label>
          <input
            className="w-[60rem]"
            id="send-tokens-to"
            type="text"
            autoComplete="off"
            spellCheck={false}
            {...register("recipient", { required: true })}
          />
        </div>
        <div className="flex items-center">
          <label className="w-48" htmlFor="send-tokens-amount">
            Amount
          </label>
          <input
            id="send-tokens-amount"
            type="text"
            spellCheck={false}
            autoComplete="off"
            {...register("amount", { required: true })}
          />
        </div>
        <div>
          <Button type="submit" processing={isLoading} disabled={!isValid || isSubmitting}>
            Send Transaction
          </Button>
          {isSuccess && (
            <pre className="text-alert-success my-8 ">
              Transaction: {JSON.stringify(data, undefined, 2)}
            </pre>
          )}
          {isError && <div className="text-alert-error my-8 ">Error : {errorSend?.message}</div>}
        </div>
        <TransactionReceipt hash={data?.hash} />
      </form>
    </Section>
  )
}
