import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "talisman-ui"
import { Hex } from "viem"
import {
  useAccount,
  useReadContract,
  useSimulateContract,
  useWalletClient,
  useWriteContract,
} from "wagmi"

import { TestBasics, useDeployment } from "../../../contracts"
import { Section } from "../../shared/Section"
import { ContractConnect } from "../shared/ContractConnect"
import { TransactionReceipt } from "../shared/TransactionReceipt"
import { useInvalidateQueries } from "../shared/useInvalidateQueries"

type FormData = { newValue: number }

export const ContractTestBasics = () => {
  const { isConnected } = useAccount()

  if (!isConnected) return null

  return (
    <Section title="Basic contract">
      <ContractTestBasicsInner />
    </Section>
  )
}

const ContractTestBasicsInner = () => {
  const { isConnected, chain } = useAccount()
  const { address } = useDeployment("TestBasics", chain?.id)

  const { data: walletClient } = useWalletClient()

  const {
    data: readData,
    isLoading: readIsLoading,
    queryKey,
  } = useReadContract({
    address,
    abi: TestBasics.abi,
    functionName: "getValue",
    query: {
      enabled: !!address,
    },
  })
  useInvalidateQueries(queryKey)

  const {
    register,
    handleSubmit,
    watch,
    formState: { isValid, isSubmitting },
  } = useForm<FormData>()

  const newValue = watch("newValue")

  const { data, error } = useSimulateContract({
    address,
    abi: TestBasics.abi,
    functionName: "setValue",
    query: { enabled: !!address && !!newValue },
    args: [newValue],
  })

  const [hash, setHash] = useState<Hex | undefined>()
  const {
    data: dataHash,
    error: writeError,
    isError: writeIsError,
    writeContract,
  } = useWriteContract()

  useEffect(() => {
    if (dataHash) setHash(dataHash)
  }, [dataHash])

  const onSubmit = useCallback(() => {
    writeContract?.(data!.request)
  }, [data, writeContract])

  // allows testing an impossible contract interaction (transfer more than you have to test)
  const handleSendUnchecked = useCallback(async () => {
    if (!walletClient || !address) return

    const hash = await walletClient.writeContract({
      abi: TestBasics.abi,
      address,
      functionName: "setValue",
      args: [newValue],
    })
    setHash(hash)
  }, [address, newValue, walletClient])

  if (!isConnected) return null

  return (
    <div>
      <ContractConnect contract="TestBasics" />
      <div className="mt-8 text-base">
        {address ? (
          <>
            <div>Current value : {readData?.toString()}</div>
            <div>Forbidden values : 69, 420, 666</div>
            <form className="text-body-secondary space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="inline-flex items-center">
                <label className="w-48" htmlFor="send-tokens-to">
                  Set value
                </label>
                <input
                  type="text"
                  id="send-tokens-to"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-12"
                  {...register("newValue", { required: true })}
                />
              </div>
              <div>
                {newValue && error && (
                  <pre className="text-alert-error h-96 p-2">{error.message}</pre>
                )}
              </div>
              <div className="flex gap-4">
                <Button
                  small
                  type="submit"
                  processing={readIsLoading}
                  disabled={!isValid || isSubmitting || !!error}
                >
                  Send
                </Button>
                <Button
                  small
                  type="button"
                  onClick={handleSendUnchecked}
                  processing={readIsLoading}
                >
                  Send unchecked
                </Button>
              </div>
            </form>
            <div className="my-8">
              {hash && (
                <>
                  <pre className="text-alert-success my-8">
                    Transaction: {JSON.stringify(hash, undefined, 2)}
                  </pre>
                  <TransactionReceipt hash={hash} />
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
      </div>
    </div>
  )
}
