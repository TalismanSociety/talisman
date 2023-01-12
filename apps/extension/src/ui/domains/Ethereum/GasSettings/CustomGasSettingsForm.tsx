import { getEip1559TotalFees } from "@core/domains/ethereum/helpers"
import { EthGasSettings, EthGasSettingsEip1559 } from "@core/domains/ethereum/types"
import { EthTransactionDetails } from "@core/domains/signing/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { IconButton } from "@talisman/components/IconButton"
import { notify } from "@talisman/components/Notifications"
import { ArrowRightIcon, InfoIcon } from "@talisman/theme/icons"
import { formatDecimals } from "@talismn/util"
import { BigNumber, ethers } from "ethers"
import { FC, PropsWithChildren, useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { Button, FormFieldContainer, FormFieldInputText, classNames } from "talisman-ui"
import * as yup from "yup"

import { NetworkUsage } from "../NetworkUsage"

type IndicatorProps = PropsWithChildren & {
  className?: string
  label?: string
}

const Indicator: FC<IndicatorProps> = ({ children, label, className }) => {
  return (
    <div
      className={classNames(
        "border-grey-700 text-body-secondary relative flex h-[41px] flex-col justify-center rounded-sm border px-6 text-xs",
        className
      )}
    >
      {label && (
        <div className="bg-grey-800 absolute left-5 top-[-0.8rem] px-2 text-[1rem]">{label}</div>
      )}
      <div className="w-full text-left align-top leading-[1.7rem]">{children}</div>
    </div>
  )
}

type CustomGasSettingsFormProps = {
  txDetails: EthTransactionDetails
  customSettings: EthGasSettingsEip1559
  onConfirm: (gasSettings: EthGasSettingsEip1559) => void
  onCancel: () => void
}

const INPUT_PROPS = {
  className: "bg-grey-700 px-6 gap-6",
}

type FormData = {
  maxBaseFee: number
  maxPriorityFee: number
  gasLimit: number
}

const schema = yup
  .object({
    maxBaseFee: yup.number().required().moreThan(0),
    maxPriorityFee: yup.number().required().moreThan(0),
    gasLimit: yup.number().required().integer().moreThan(27000),
  })
  .required()

export const CustomGasSettingsForm: FC<CustomGasSettingsFormProps> = ({
  customSettings,
  onCancel,
  txDetails,
}) => {
  const baseFee = useMemo(
    // TODO custom formatDecimals that won't use compact mode
    () => formatDecimals(ethers.utils.formatUnits(txDetails.baseFeePerGas as string, "gwei")),
    [txDetails.baseFeePerGas]
  )

  const defaultValues: FormData = useMemo(
    () => ({
      maxBaseFee: Number(
        // TODO custom formatDecimals that won't use compact mode
        formatDecimals(
          ethers.utils.formatUnits(
            BigNumber.from(customSettings.maxFeePerGas).sub(customSettings.maxPriorityFeePerGas),
            "gwei"
          )
        )
      ),
      maxPriorityFee: Number(
        // TODO custom formatDecimals that won't use compact mode
        formatDecimals(ethers.utils.formatUnits(customSettings.maxPriorityFeePerGas, "gwei"))
      ),
      gasLimit: BigNumber.from(customSettings.gasLimit).toNumber(),
    }),
    [customSettings]
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    resetField,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
    defaultValues,
  })

  const totalMaxFee = useMemo(() => {}, [])

  const submit = useCallback(async (formData: FormData) => {
    try {
      // assert(tokenInfo, "Missing token info")
      // assert(tokenInfo.contractAddress === token.contractAddress, "Token mismatch")
      // assert(tokenInfo.evmNetworkId === token.evmNetworkId, "Token mismatch")
      // // save the object composed with CoinGecko and chain data
      // await api.addCustomErc20Token(tokenInfo)
      // navigate("/tokens")
    } catch (err) {
      notify({ title: "Error", subtitle: (err as Error).message, type: "error" })
      // setError(`Failed to add the token : ${(err as Error)?.message ?? ""}`)
    }
  }, [])

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="text-body-secondary bg-black-tertiary flex flex-col gap-12 rounded-t-xl p-12 text-sm"
    >
      <div className="flex w-full font-bold text-white">
        <div>
          <IconButton>
            <ArrowRightIcon className="text-md rotate-180 text-white" onClick={onCancel} />
          </IconButton>
        </div>
        <div className="mr-9 grow text-center">Custom Gas Fee</div>
      </div>
      <div>Set your own custom gas fee to control the priority and cost of your transaction.</div>
      <div>
        <div className="grid grid-cols-2 gap-8">
          <Indicator label="Base Fee">
            {/* <div className="flex items-center gap-2">
              <span>10 GWEI</span>
              <InfoIcon className="inline-block text-base" />
            </div> */}
            {baseFee} GWEI <InfoIcon className="inline align-sub text-base" />
          </Indicator>
          <Indicator label="Network Usage">
            <NetworkUsage
              baseFeeTrend={txDetails.baseFeeTrend}
              className="w-full justify-between"
            />
          </Indicator>
          <FormFieldContainer
            label={
              <span className="text-sm">
                Max Base Fee <InfoIcon className="inline align-top" />
              </span>
            }
            error={errors.maxBaseFee?.message}
          >
            <FormFieldInputText
              after={<span className="text-body-disabled text-sm">GWEI</span>}
              containerProps={INPUT_PROPS}
              {...register("maxBaseFee", {
                valueAsNumber: true,
              })}
            />
          </FormFieldContainer>
          <FormFieldContainer
            label={
              <span className="text-sm">
                Max Priority Fee <InfoIcon className="inline align-top" />
              </span>
            }
            error={errors.maxPriorityFee?.message}
          >
            <FormFieldInputText
              after={<span className="text-body-disabled text-sm">GWEI</span>}
              containerProps={INPUT_PROPS}
              {...register("maxPriorityFee", {
                valueAsNumber: true,
              })}
            />
          </FormFieldContainer>
          <FormFieldContainer
            className="col-span-2"
            label={
              <span className="text-sm">
                Gas Limit <InfoIcon className="inline align-top" />
              </span>
            }
            error={errors.gasLimit?.message}
          >
            <FormFieldInputText
              containerProps={INPUT_PROPS}
              {...register("gasLimit", {
                valueAsNumber: true,
              })}
            />
          </FormFieldContainer>
        </div>
      </div>

      <div className="border-grey-700 text-body flex h-[5.2rem] w-full justify-between rounded-sm border px-8 font-bold">
        <div>
          Total Max Fee <InfoIcon className="inline-block align-sub" />
        </div>
        <div>$0.98 (0.06 MOVR)</div>
      </div>
      <div className="w-full">
        <Button type="submit" className="w-full" disabled={!isValid}>
          Save
        </Button>
      </div>
    </form>
  )
}
