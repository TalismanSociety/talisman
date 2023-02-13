import { BigNumber, ethers, providers } from "ethers"
import { parseEther, parseUnits, serializeTransaction } from "ethers/lib/utils"
import { useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useLocalStorage } from "react-use"
import { Button } from "talisman-ui"
import {
  erc20ABI,
  useAccount,
  useContractRead,
  useContractWrite,
  useNetwork,
  usePrepareContractWrite,
  usePrepareSendTransaction,
  useSendTransaction,
  useSigner,
  useWaitForTransaction,
} from "wagmi"

import { Section } from "../Section"
import { getUSDCAddress } from "./contracts"
import erc20 from "./contracts/erc20.json"
import { TransactionReceipt } from "./shared/TransactionReceipt"

type FormData = { recipient: string; amount: string }

const DEFAULT_VALUE = {
  recipient: "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67",
  amount: "0.001",
}

export const SendERC20 = () => {
  const { isConnected, address, connector } = useAccount()
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

  const contractAddress = useMemo(() => getUSDCAddress(chain?.id), [chain?.id])
  const {
    data: balanceOfSelfData,
    isError: balanceOfSelfIsError,
    isLoading: balanceOfSelfIsLoading,
  } = useContractRead({
    address: contractAddress,
    abi: erc20,
    functionName: "balanceOf",
    args: [address],
    enabled: !!contractAddress && !!address,
  })
  const {
    data: balanceOfTargetData,
    isError: balanceOfTargetIsError,
    isLoading: balanceOfTargetIsLoading,
  } = useContractRead({
    address: contractAddress,
    abi: erc20,
    functionName: "balanceOf",
    args: [formData.recipient],
    enabled: !!contractAddress && !!formData.recipient,
  })

  const {
    config,
    isSuccess: prepIsSuccess,
    error: prepError,
  } = usePrepareContractWrite({
    address: contractAddress,
    abi: erc20,
    functionName: "transfer",
    enabled: !!contractAddress && !!balanceOfSelfData,
    args: [formData.recipient, parseUnits(formData.amount, 6)],
  })

  const {
    isLoading: writeIsLoading,
    isSuccess: writeIsSuccess,
    error: writeError,
    write,
  } = useContractWrite({
    address: contractAddress,
    abi: erc20,
    functionName: "transfer",
    mode: "recklesslyUnprepared",
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

  // allows testing an impossible contract interaction (transfer more than you have to test)
  const handleSendUnchecked = useCallback(async () => {
    if (!connector) return

    const ci = new ethers.utils.Interface(erc20ABI)

    const funcFragment = ci.fragments.find(
      (f) => f.type === "function" && f.name === "transfer"
    ) as ethers.utils.FunctionFragment

    const data = ci.encodeFunctionData(funcFragment, [
      formData.recipient,
      parseUnits(formData.amount, 6),
    ])

    const provider = await connector.getProvider()
    const sig = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: address,
          to: contractAddress,
          data,
        },
      ],
    })
  }, [address, connector, contractAddress, formData.amount, formData.recipient])

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
                {!balanceOfSelfIsError && balanceOfTargetData
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
              <Button
                type="button"
                processing={writeIsLoading}
                disabled={!isValid || isSubmitting}
                onClick={handleSendUnchecked}
              >
                Send Transaction (unchecked)
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
