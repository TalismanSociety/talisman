import { getMaxFeePerGas } from "@core/domains/ethereum/helpers"
import { EthGasSettingsEip1559 } from "@core/domains/ethereum/types"
import { EthTransactionDetails, GasSettingsByPriority } from "@core/domains/signing/types"
import { log } from "@core/log"
import { yupResolver } from "@hookform/resolvers/yup"
import { IconButton } from "@talisman/components/IconButton"
import { notify } from "@talisman/components/Notifications"
import { WithTooltip } from "@talisman/components/Tooltip"
import { AlertTriangleIcon, ArrowRightIcon, InfoIcon, LoaderIcon } from "@talisman/theme/icons"
import { BalanceFormatter } from "@talismn/balances"
import { EvmNativeToken } from "@talismn/balances-evm-native"
import { formatDecimals } from "@talismn/util"
import Fiat from "@ui/domains/Asset/Fiat"
import Tokens from "@ui/domains/Asset/Tokens"
import { useDbCache } from "@ui/hooks/useDbCache"
import { BigNumber, ethers } from "ethers"
import { FC, PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useDebounce } from "react-use"
import { Button, FormFieldContainer, FormFieldInputText, classNames } from "talisman-ui"
import * as yup from "yup"

import { NetworkUsage } from "../NetworkUsage"
import { useIsValidEthTransaction } from "../Sign/useIsValidEthTransaction"
import { useEthereumProvider } from "../useEthereumProvider"

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

const MessageRow = ({ type, message }: { type: "error" | "warning"; message: string }) => {
  return (
    <div
      className={classNames(
        "mt-4 mb-6 h-8 w-full text-left text-xs",
        type === "warning" && "text-alert-warn",
        type === "error" && "text-alert-error",
        message ? "visible" : "invisible"
      )}
    >
      {message && (
        <>
          {type === "warning" && <InfoIcon className="inline align-top" />}
          {type === "error" && <AlertTriangleIcon className="inline align-top" />} {message}
        </>
      )}
    </div>
  )
}

type CustomGasSettingsFormProps = {
  tx: ethers.providers.TransactionRequest
  nativeToken: EvmNativeToken
  txDetails: EthTransactionDetails
  gasSettingsByPriority: GasSettingsByPriority
  onConfirm: (gasSettings: EthGasSettingsEip1559) => void
  onCancel: () => void
}

const INPUT_PROPS = {
  className: "bg-grey-700 px-6 gap-6 h-[5rem]",
}

type FormData = {
  maxBaseFee: number
  maxPriorityFee: number
  gasLimit: number
}

const gasSettingsFromFormData = (formData: FormData): EthGasSettingsEip1559 => ({
  type: 2,
  maxFeePerGas: BigNumber.from(
    Math.round((formData.maxBaseFee + formData.maxPriorityFee) * Math.pow(10, 9))
  ),
  maxPriorityFeePerGas: BigNumber.from(Math.round(formData.maxPriorityFee * Math.pow(10, 9))),
  gasLimit: formData.gasLimit,
})

const schema = yup
  .object({
    maxBaseFee: yup.number().required().moreThan(0),
    maxPriorityFee: yup.number().required().min(0),
    gasLimit: yup.number().required().integer().min(21000),
  })
  .required()

const useIsValidGasSettings = (
  tx: ethers.providers.TransactionRequest,
  maxBaseFee: number,
  maxPriorityFee: number,
  gasLimit: number
) => {
  const [debouncedFormData, setDebouncedFormData] = useState<FormData>({
    maxBaseFee,
    maxPriorityFee,
    gasLimit,
  })

  // isLoading buffer for debounce
  // prevents UI from displaying a new total max fee before it's validated from chain
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
  }, [maxBaseFee, maxPriorityFee, gasLimit])

  useDebounce(
    () => {
      setDebouncedFormData({ maxBaseFee, maxPriorityFee, gasLimit })
      setIsLoading(false)
    },
    250,
    [maxBaseFee, maxPriorityFee, gasLimit]
  )

  const provider = useEthereumProvider(tx.chainId?.toString())

  const txPrepared = useMemo(() => {
    try {
      if (!debouncedFormData) return undefined
      return {
        ...tx,
        ...gasSettingsFromFormData(debouncedFormData),
      } as ethers.providers.TransactionRequest
    } catch (err) {
      // any bad input throws here, ignore
      return undefined
    }
  }, [debouncedFormData, tx])

  const { isLoading: isValidationLoading, ...rest } = useIsValidEthTransaction(
    provider,
    txPrepared,
    "custom"
  )

  return {
    isLoading: isLoading || isValidationLoading,
    ...rest,
  }
}

export const CustomGasSettingsForm: FC<CustomGasSettingsFormProps> = ({
  tx,
  nativeToken,
  gasSettingsByPriority,
  onCancel,
  txDetails,
  onConfirm,
}) => {
  const { customSettings, highSettings } = useMemo(
    () => ({
      customSettings: gasSettingsByPriority.custom as EthGasSettingsEip1559,
      highSettings: gasSettingsByPriority.high as EthGasSettingsEip1559,
    }),
    [gasSettingsByPriority]
  )

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
    formState: { errors, isValid: isFormValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    reValidateMode: "onChange",
    resolver: yupResolver(schema),
    defaultValues,
  })

  // apply default values ourselves as RHF won't consider form valid if untouched
  const refInitialized = useRef(false)
  useEffect(() => {
    if (refInitialized.current || !defaultValues) return
    setValue("maxBaseFee", defaultValues.maxBaseFee, { shouldTouch: true, shouldValidate: true })
    setValue("maxPriorityFee", defaultValues.maxPriorityFee, {
      shouldTouch: true,
      shouldValidate: true,
    })
    setValue("gasLimit", defaultValues.gasLimit, { shouldTouch: true, shouldValidate: true })
    refInitialized.current = true
  }, [defaultValues, setValue])

  const { maxBaseFee, maxPriorityFee, gasLimit } = watch()

  const { tokenRatesMap } = useDbCache() // TODO use useTokenRates

  const totalMaxFee = useMemo(() => {
    try {
      const bnTotalMaxFee = BigNumber.from(ethers.utils.parseUnits(String(maxBaseFee), "gwei"))
        .add(ethers.utils.parseUnits(String(maxPriorityFee), "gwei"))
        .mul(gasLimit)
      return new BalanceFormatter(
        bnTotalMaxFee.toString(),
        nativeToken.decimals,
        tokenRatesMap[nativeToken.id]
      )
    } catch (err) {
      return null
    }
  }, [gasLimit, maxBaseFee, maxPriorityFee, nativeToken, tokenRatesMap])

  const { warningFee, errorGasLimit } = useMemo(() => {
    let warningFee = ""
    let errorGasLimit = ""

    if (errors.maxBaseFee) warningFee = "Max Base Fee is invalid"
    else if (errors.maxPriorityFee) warningFee = "Max Priority Fee is invalid"
    // if lower than lowest possible fee after 20 blocks
    else if (
      maxBaseFee &&
      txDetails.baseFeePerGas &&
      BigNumber.from(ethers.utils.parseUnits(String(maxBaseFee), "gwei")).lt(
        getMaxFeePerGas(txDetails.baseFeePerGas, 0, 20, false)
      )
    )
      warningFee = "Max Base Fee seems too low for current network conditions"
    // if higher than highest possible fee after 20 blocks
    else if (
      txDetails.baseFeePerGas &&
      maxBaseFee &&
      BigNumber.from(ethers.utils.parseUnits(String(maxBaseFee), "gwei")).gt(
        getMaxFeePerGas(txDetails.baseFeePerGas, 0, 20)
      )
    )
      warningFee = "Max Base Fee seems higher than required"
    else if (
      maxPriorityFee &&
      BigNumber.from(ethers.utils.parseUnits(String(maxPriorityFee), "gwei")).gt(
        BigNumber.from(2).mul(highSettings?.maxPriorityFeePerGas)
      )
    )
      warningFee = "Max Priority Fee seems higher than required"

    if (errors.gasLimit?.type === "min") errorGasLimit = "Gas Limit minimum value is 21000"
    else if (errors.gasLimit) errorGasLimit = "Gas Limit is invalid"
    else if (gasLimit < txDetails.estimatedGas)
      errorGasLimit = "Gas Limit too low, transaction likely to fail"

    return {
      warningFee,
      errorGasLimit,
    }
  }, [
    errors.gasLimit,
    errors.maxBaseFee,
    errors.maxPriorityFee,
    gasLimit,
    highSettings?.maxPriorityFeePerGas,
    maxBaseFee,
    maxPriorityFee,
    txDetails.baseFeePerGas,
    txDetails.estimatedGas,
  ])

  const submit = useCallback(
    async (formData: FormData) => {
      try {
        const gasSettings = gasSettingsFromFormData(formData)
        onConfirm(gasSettings)
      } catch (err) {
        log.error("Failed to set custom gas settings", { err })
        notify({ title: "Error", subtitle: (err as Error).message, type: "error" })
      }
    },
    [onConfirm]
  )

  const { isValid: isGasSettingsValid, isLoading: isLoadingGasSettingsValid } =
    useIsValidGasSettings(tx, maxBaseFee, maxPriorityFee, gasLimit)

  const showMaxFeeTotal = isFormValid && isGasSettingsValid && !isLoadingGasSettingsValid

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="text-body-secondary bg-black-tertiary flex flex-col rounded-t-xl p-12 text-sm"
    >
      <div className="flex w-full font-bold text-white">
        <div>
          <IconButton>
            <ArrowRightIcon className="text-md rotate-180 text-white" onClick={onCancel} />
          </IconButton>
        </div>
        <div className="mr-9 grow text-center">Custom Gas Fee</div>
      </div>
      <div className="mt-12 mb-16">
        Set your own custom gas fee to control the priority and cost of your transaction.
      </div>
      <div className="grid grid-cols-2 gap-8 gap-y-14">
        <Indicator label="Base Fee">
          {baseFee} GWEI{" "}
          <WithTooltip
            className="inline-flex h-[1.5rem] flex-col justify-center align-text-top"
            tooltip="The base fee is set by the network and changes depending on network usage"
          >
            <InfoIcon />
          </WithTooltip>
        </Indicator>
        <Indicator label="Base Fee Trend">
          <NetworkUsage baseFeeTrend={txDetails.baseFeeTrend} className="w-full justify-between" />
        </Indicator>
        <FormFieldContainer
          noErrorRow
          label={
            <span className="text-sm">
              Max Base Fee{" "}
              <WithTooltip tooltip="The maximum base fee you are willing to pay to have this transaction confirmed">
                <InfoIcon className="inline align-text-top" />
              </WithTooltip>
            </span>
          }
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
          noErrorRow
          label={
            <span className="text-sm">
              Max Priority Fee{" "}
              <WithTooltip tooltip="This fee is paid directly to miners to incentivise them to include your transaction in a block. The higher the Max Priority Fee, the faster your transaction will be confirmed">
                <InfoIcon className="inline align-text-top" />
              </WithTooltip>
            </span>
          }
        >
          <FormFieldInputText
            after={<span className="text-body-disabled text-sm">GWEI</span>}
            containerProps={INPUT_PROPS}
            {...register("maxPriorityFee", {
              valueAsNumber: true,
            })}
          />
        </FormFieldContainer>
      </div>
      <MessageRow type="warning" message={warningFee} />
      <FormFieldContainer
        noErrorRow
        className="w-full"
        label={
          <span className="text-sm">
            Gas Limit{" "}
            <WithTooltip tooltip="The maximum amount of gas this transaction is allowed to consume ">
              <InfoIcon className="inline align-text-top" />
            </WithTooltip>
          </span>
        }
      >
        <FormFieldInputText
          containerProps={INPUT_PROPS}
          {...register("gasLimit", {
            valueAsNumber: true,
          })}
        />
      </FormFieldContainer>
      <MessageRow type="error" message={errorGasLimit} />

      <div className="border-grey-700 text-body flex h-[5.2rem] w-full justify-between rounded-sm border px-8 font-bold">
        <div>
          Total Max Fee{" "}
          <WithTooltip tooltip="The total maximum gas fee you are willing to pay for this transaction : (Max Base Fee + Max Priority Fee) * Gas Limit">
            <InfoIcon className="inline-block align-text-top" />
          </WithTooltip>
        </div>
        <div>
          {totalMaxFee && showMaxFeeTotal ? (
            <>
              <Tokens
                amount={totalMaxFee.tokens}
                decimals={nativeToken.decimals}
                symbol={nativeToken.symbol}
              />
              {totalMaxFee.fiat("usd") ? (
                <>
                  {" "}
                  (<Fiat amount={totalMaxFee.fiat("usd")} currency="usd" />)
                </>
              ) : null}
            </>
          ) : isLoadingGasSettingsValid ? (
            <LoaderIcon className="animate-spin-slow text-body-secondary inline-block" />
          ) : (
            <span className="text-alert-error">Invalid settings</span>
          )}
        </div>
      </div>
      <div className="mt-10 w-full">
        <Button
          type="submit"
          className="w-full"
          disabled={!showMaxFeeTotal}
          primary={showMaxFeeTotal}
        >
          Save
        </Button>
      </div>
    </form>
  )
}
