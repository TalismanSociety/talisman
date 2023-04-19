import { parseEther } from "ethers/lib/utils"
import { useForm } from "react-hook-form"
import { useLocalStorage } from "react-use"
import { Button } from "talisman-ui"
import { useAccount, usePrepareSendTransaction, useSendTransaction } from "wagmi"

import { Section } from "../shared/Section"
import { TransactionReceipt } from "./shared/TransactionReceipt"

type FormData = { recipient: string; amount: string }

const DEFAULT_VALUE = {
  recipient: "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67",
  amount: "0.001",
}

export const SendTokens = () => {
  const { isConnected } = useAccount()
  const [defaultValues, setDefaultValues] = useLocalStorage("pg:send-tokens", DEFAULT_VALUE)

  const {
    register,
    handleSubmit,
    watch,
    formState: { isValid, isSubmitting },
  } = useForm<FormData>({
    defaultValues,
  })

  const formData = watch()
  const { config } = usePrepareSendTransaction({
    request: {
      to: formData.recipient,
      value: formData.amount ? parseEther(formData.amount) : undefined,
    },
  })

  const {
    sendTransaction,
    isLoading,
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
            className="w-[60rem] font-mono"
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
