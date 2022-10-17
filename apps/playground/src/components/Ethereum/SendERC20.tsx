import {
  useAccount,
  useContractRead,
  useNetwork,
  usePrepareContractWrite,
  usePrepareSendTransaction,
  useSendTransaction,
  useWaitForTransaction,
} from "wagmi"
import { useForm } from "react-hook-form"
import { parseEther, parseUnits } from "ethers/lib/utils"
import { Section } from "../Section"
import { Button } from "talisman-ui"
import { useLocalStorage } from "react-use"
import { TransactionReceipt } from "./shared/TransactionReceipt"
import erc20 from "./contracts/erc20.json"
import { getUSDCAddress } from "./contracts"
import { useMemo } from "react"
import { BigNumber, ethers } from "ethers"

type FormData = { recipient: string; amount: string }

const DEFAULT_VALUE = {
  recipient: "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67",
  amount: "0.001",
}

export const SendERC20 = () => {
  const { isConnected, address } = useAccount()
  const { chain } = useNetwork()
  const [defaultValues, setDefaultValues] = useLocalStorage("pg:send-erc20", DEFAULT_VALUE)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    defaultValues,
  })

  const formData = watch()

  const contractAddress = useMemo(() => getUSDCAddress(chain?.id) as string, [chain?.id])
  const {
    data: balanceOfSelfData,
    isError: balanceOfSelfIsError,
    isLoading: balanceOfSelfIsLoading,
  } = useContractRead({
    addressOrName: contractAddress,
    contractInterface: erc20,
    functionName: "balanceOf",
    args: [address],
    enabled: !!contractAddress && !!address,
  })
  const {
    data: balanceOfTargetData,
    isError: balanceOfTargetIsError,
    isLoading: balanceOfTargetIsLoading,
  } = useContractRead({
    addressOrName: contractAddress,
    contractInterface: erc20,
    functionName: "balanceOf",
    args: [formData.recipient],
    enabled: !!contractAddress && !!formData.recipient,
  })

  const {
    config,
    isSuccess: prepIsSuccess,
    error: prepError,
  } = usePrepareContractWrite({
    addressOrName: contractAddress,
    contractInterface: erc20,
    functionName: "transfer",
    enabled: !!contractAddress && !!balanceOfSelfData,
    args: [formData.recipient, parseUnits(formData.amount, 6)],
  })

  const {
    sendTransaction,
    isLoading: sendIsLoading,
    isSuccess: sendIsSuccess,
    isError: sendIsError,
    data: senddata,
    error: sendError,
  } = useSendTransaction(config)

  const onSubmit = (data: FormData) => {
    setDefaultValues(data)
    sendTransaction?.()
  }

  if (!isConnected) return null

  return (
    <Section title="Send ERC20 (USDC)">
      {contractAddress ? (
        <>
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
              <div>
                Self balance :{" "}
                {!balanceOfTargetIsError && balanceOfSelfData
                  ? ethers.utils.formatUnits(
                      BigNumber.from(balanceOfSelfData as unknown as string),
                      6
                    )
                  : "N/A"}
              </div>
              <div>
                Target balance :{" "}
                {!balanceOfSelfIsError && balanceOfSelfData
                  ? ethers.utils.formatUnits(
                      BigNumber.from(balanceOfTargetData as unknown as string),
                      6
                    )
                  : "N/A"}
              </div>
            </div>
            <div>
              <Button
                type="submit"
                processing={sendIsLoading}
                disabled={!isValid || isSubmitting || !prepIsSuccess}
              >
                Send Transaction
              </Button>
              {sendIsSuccess && (
                <pre className="text-alert-success my-8 ">
                  Transaction: {JSON.stringify(senddata, undefined, 2)}
                </pre>
              )}
              {sendIsError && (
                <div className="text-alert-error my-8 ">Error : {sendError?.message}</div>
              )}
            </div>
            <TransactionReceipt hash={senddata?.hash} />
          </form>
        </>
      ) : (
        <div className="text-body-secondary">USDC's address isn't available on this network.</div>
      )}
    </Section>
  )
}
