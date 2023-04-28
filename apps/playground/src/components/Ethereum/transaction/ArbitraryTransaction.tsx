import { parseEther } from "ethers/lib/utils"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useLocalStorage } from "react-use"
import { Button } from "talisman-ui"
import { useAccount, usePrepareSendTransaction, useSendTransaction } from "wagmi"

import { Section } from "../../shared/Section"
import { TransactionReceipt } from "../shared/TransactionReceipt"

type FormData = { to: string; amount?: string; data?: string }

const DEFAULT_VALUE: FormData = {
  to: "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67",
  amount: "0.001",
  data: "",
}

const SendTokensInner = () => {
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

  const request = useMemo(
    () => ({
      to: formData.to,
      value: formData.amount ? parseEther(formData.amount) : undefined,
      data: formData.data || undefined,
    }),
    [formData.amount, formData.data, formData.to]
  )

  const { config } = usePrepareSendTransaction({
    request,
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
    <form className="text-body-secondary space-y-4 text-base" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center">
        <label className="w-48" htmlFor="tx-to">
          To
        </label>
        <input
          className="h-16 w-[42rem] font-mono "
          id="tx-to"
          type="text"
          autoComplete="off"
          spellCheck={false}
          {...register("to", { required: true })}
        />
      </div>
      <div className="flex items-center">
        <label className="w-48" htmlFor="send-tokens-amount">
          Data
        </label>
        <textarea
          id="tx-data"
          placeholder="0x..."
          className="w-[42rem] font-mono "
          rows={3}
          spellCheck={false}
          autoComplete="off"
          {...register("data", { required: false })}
        />
      </div>
      <div className="flex items-center">
        <label className="w-48" htmlFor="send-tokens-amount">
          Amount
        </label>
        <input
          id="tx-amount"
          type="text"
          spellCheck={false}
          autoComplete="off"
          {...register("amount", { required: false })}
        />
      </div>

      <div className="pt-4">
        <Button small type="submit" processing={isLoading} disabled={!isValid || isSubmitting}>
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
  )
}

export const ArbitraryTransaction = () => (
  <Section title="Transaction">
    <SendTokensInner />
  </Section>
)
