import { useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { Button } from "talisman-ui"
import {
  useAccount,
  useContractRead,
  useContractWrite,
  useNetwork,
  usePrepareContractWrite,
  useSignMessage,
} from "wagmi"

import { Section } from "../Section"
import { GreeterAbi, getGreeterAddress } from "./contracts"
import { TransactionReceipt } from "./shared/TransactionReceipt"

type FormData = { message: string }

const DEFAULT_VALUE: FormData = {
  message: `Hello Talisman`,
}

export const ContractReadWrite = () => {
  const { isConnected } = useAccount()
  const { chain } = useNetwork()

  const contractAddress = useMemo(() => getGreeterAddress(chain?.id), [chain?.id])

  const {
    data: readData,
    isError: readIsError,
    isLoading: readIsLoading,
  } = useContractRead({
    address: contractAddress,
    abi: GreeterAbi.abi,
    functionName: "greet",
    enabled: !!contractAddress,
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isValid, isSubmitting },
  } = useForm<FormData>({
    defaultValues: DEFAULT_VALUE,
  })

  const message = watch("message")

  const { config } = usePrepareContractWrite({
    address: contractAddress,
    abi: GreeterAbi.abi,
    functionName: "setGreeting",
    enabled: !!contractAddress,
    args: [message],
  })
  const {
    data: writeData,
    isLoading: writeIsLoading,
    isSuccess: writeIsSuccess,
    error: writeError,
    isError: writeIsError,
    write,
  } = useContractWrite(config)

  const onSubmit = useCallback(
    (data: FormData) => {
      write?.()
    },
    [write]
  )

  useEffect(() => {
    setValue("message", (readData as unknown as string) ?? "", { shouldValidate: true })
  }, [readData, setValue])

  if (!isConnected) return null

  return (
    <Section title="Contract Read/Write">
      {contractAddress ? (
        <>
          <form className="text-md text-body-secondary space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex items-center">
              <label className="w-48" htmlFor="send-tokens-to">
                Message
              </label>
              <input
                type="text"
                className="w-[60rem] "
                id="send-tokens-to"
                autoComplete="off"
                spellCheck={false}
                {...register("message", { required: true })}
              />
            </div>
            <div>
              <Button type="submit" processing={readIsLoading} disabled={!isValid || isSubmitting}>
                Sign message
              </Button>
            </div>
          </form>
          <div className="my-8">
            {writeIsSuccess && (
              <>
                <pre className="text-alert-success my-8 ">
                  Transaction: {JSON.stringify(writeData, undefined, 2)}
                </pre>
                <TransactionReceipt hash={writeData?.hash} />
              </>
            )}
            {writeIsError && (
              <div className="text-alert-error my-8 ">Error : {writeError?.message}</div>
            )}
          </div>
        </>
      ) : (
        <div className="text-body-secondary">Test contract isn't deployed on this network.</div>
      )}
    </Section>
  )
}
