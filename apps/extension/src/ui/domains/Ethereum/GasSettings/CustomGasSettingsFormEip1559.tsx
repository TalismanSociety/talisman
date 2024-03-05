import { yupResolver } from "@hookform/resolvers/yup"
import { notify } from "@talisman/components/Notifications"
import { WithTooltip } from "@talisman/components/Tooltip"
import { TokenId } from "@talismn/chaindata-provider"
import { ArrowRightIcon, InfoIcon, LoaderIcon } from "@talismn/icons"
import { formatDecimals } from "@talismn/util"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { getHumanReadableErrorMessage } from "extension-core"
import { getMaxFeePerGas } from "extension-core"
import { EthGasSettingsEip1559, EvmNetworkId } from "extension-core"
import { EthTransactionDetails, GasSettingsByPriorityEip1559 } from "extension-core"
import { log } from "extension-shared"
import { FC, FormEventHandler, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useDebounce } from "react-use"
import { IconButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import { TransactionRequest, formatGwei, parseGwei } from "viem"
import * as yup from "yup"

import { NetworkUsage } from "../NetworkUsage"
import { useIsValidEthTransaction } from "../useIsValidEthTransaction"
import { usePublicClient } from "../usePublicClient"
import { Indicator, MessageRow } from "./common"

const INPUT_PROPS = {
  className: "bg-grey-700 px-6 gap-6 h-[5rem]",
}

type FormData = {
  maxBaseFee: number
  maxPriorityFee: number
  gasLimit: number
}

const gasSettingsFromFormData = (formData: FormData): EthGasSettingsEip1559 => ({
  type: "eip1559",
  maxFeePerGas: BigInt(
    Math.round((formData.maxBaseFee + formData.maxPriorityFee) * Math.pow(10, 9))
  ),
  maxPriorityFeePerGas: BigInt(Math.round(formData.maxPriorityFee * Math.pow(10, 9))),
  gas: BigInt(formData.gasLimit),
})

const schema = yup
  .object({
    maxBaseFee: yup.number().required().moreThan(0),
    maxPriorityFee: yup.number().required().min(0),
    gasLimit: yup.number().required().integer().min(21000),
  })
  .required()

const useIsValidGasSettings = (
  evmNetworkId: EvmNetworkId,
  tx: TransactionRequest,
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

  const publicClient = usePublicClient(evmNetworkId)

  const txPrepared = useMemo(() => {
    try {
      if (!debouncedFormData) return undefined
      return {
        ...tx,
        ...gasSettingsFromFormData(debouncedFormData),
      } as TransactionRequest
    } catch (err) {
      // any bad input throws here, ignore
      return undefined
    }
  }, [debouncedFormData, tx])

  const { isLoading: isValidationLoading, ...rest } = useIsValidEthTransaction(
    publicClient,
    txPrepared,
    "custom"
  )

  return {
    isLoading: isLoading || isValidationLoading,
    ...rest,
  }
}

type CustomGasSettingsFormEip1559Props = {
  tx: TransactionRequest
  tokenId: TokenId
  txDetails: EthTransactionDetails
  gasSettingsByPriority: GasSettingsByPriorityEip1559
  onConfirm: (gasSettings: EthGasSettingsEip1559) => void
  onCancel: () => void
}

export const CustomGasSettingsFormEip1559: FC<CustomGasSettingsFormEip1559Props> = ({
  tx,
  tokenId,
  gasSettingsByPriority,
  onCancel,
  txDetails,
  onConfirm,
}) => {
  const { t } = useTranslation("request")
  const { genericEvent } = useAnalytics()

  useEffect(() => {
    genericEvent("open custom gas settings", {
      network: Number(txDetails.evmNetworkId),
      gasType: gasSettingsByPriority?.type,
    })
  }, [gasSettingsByPriority?.type, genericEvent, txDetails.evmNetworkId])

  const { customSettings, highSettings } = useMemo(
    () => ({
      customSettings: gasSettingsByPriority.custom as EthGasSettingsEip1559,
      highSettings: gasSettingsByPriority.high as EthGasSettingsEip1559,
    }),
    [gasSettingsByPriority]
  )

  const baseFee = useMemo(
    () =>
      txDetails.baseFeePerGas
        ? formatDecimals(formatGwei(txDetails.baseFeePerGas), undefined, {
            notation: "standard",
          })
        : t("N/A"),
    [t, txDetails.baseFeePerGas]
  )

  const defaultValues: FormData = useMemo(
    () => ({
      maxBaseFee: Number(
        formatDecimals(
          formatGwei(customSettings.maxFeePerGas - customSettings.maxPriorityFeePerGas),
          undefined,
          { notation: "standard" }
        )
      ),
      maxPriorityFee: Number(
        formatDecimals(formatGwei(customSettings.maxPriorityFeePerGas), undefined, {
          notation: "standard",
        })
      ),
      gasLimit: Number(customSettings.gas),
    }),
    [customSettings]
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid: isFormValid },
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

  const totalMaxFee = useMemo(() => {
    try {
      return (parseGwei(String(maxBaseFee)) + parseGwei(String(maxPriorityFee))) * BigInt(gasLimit)
    } catch (err) {
      return null
    }
  }, [gasLimit, maxBaseFee, maxPriorityFee])

  const { warningFee, errorGasLimit } = useMemo(() => {
    let warningFee = ""
    let errorGasLimit = ""

    if (errors.maxBaseFee) warningFee = t("Max Base Fee is invalid")
    else if (errors.maxPriorityFee) warningFee = t("Max Priority Fee is invalid")
    // if lower than lowest possible fee after 20 blocks
    else if (
      maxBaseFee &&
      txDetails.baseFeePerGas &&
      parseGwei(String(maxBaseFee)) < getMaxFeePerGas(txDetails.baseFeePerGas, 0n, 20, false)
    )
      warningFee = t("Max Base Fee seems too low for current network conditions")
    // if higher than highest possible fee after 20 blocks
    else if (
      txDetails.baseFeePerGas &&
      maxBaseFee &&
      parseGwei(String(maxBaseFee)) > getMaxFeePerGas(txDetails.baseFeePerGas, 0n, 20)
    )
      warningFee = t("Max Base Fee seems higher than required")
    else if (
      maxPriorityFee &&
      parseGwei(String(maxPriorityFee)) > 2n * highSettings.maxPriorityFeePerGas
    )
      warningFee = t("Max Priority Fee seems higher than required")

    if (errors.gasLimit?.type === "min") errorGasLimit = t("Gas Limit minimum value is 21000")
    else if (errors.gasLimit) errorGasLimit = t("Gas Limit is invalid")
    else if (txDetails.estimatedGas > gasLimit)
      errorGasLimit = t("Gas Limit too low, transaction likely to fail")

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
    t,
  ])

  const submit = useCallback(
    async (formData: FormData) => {
      try {
        const gasSettings = gasSettingsFromFormData(formData)

        genericEvent("set custom gas settings", {
          network: Number(txDetails.evmNetworkId),
          gasType: gasSettings.type,
        })

        onConfirm(gasSettings)
      } catch (err) {
        log.error("Failed to set custom gas settings", { err })
        notify({ title: "Error", subtitle: (err as Error).message, type: "error" })
      }
    },
    [genericEvent, onConfirm, txDetails.evmNetworkId]
  )

  const {
    isValid: isGasSettingsValid,
    isLoading: isLoadingGasSettingsValid,
    error: gasSettingsError,
  } = useIsValidGasSettings(txDetails.evmNetworkId, tx, maxBaseFee, maxPriorityFee, gasLimit)

  const showMaxFeeTotal = isFormValid && isGasSettingsValid && !isLoadingGasSettingsValid

  // don't bubble up submit event, in case we're in another form (send funds v1)
  const submitWithoutBubbleUp: FormEventHandler<HTMLFormElement> = useCallback(
    (e) => {
      e.preventDefault()
      handleSubmit(submit)(e)
      e.stopPropagation()
    },
    [handleSubmit, submit]
  )

  return (
    <form
      onSubmit={submitWithoutBubbleUp}
      className="text-body-secondary bg-black-tertiary flex flex-col rounded-t-xl p-12 text-sm"
    >
      <div className="flex w-full font-bold text-white">
        <div>
          <IconButton>
            <ArrowRightIcon className="text-md rotate-180 text-white" onClick={onCancel} />
          </IconButton>
        </div>
        <div className="mr-9 grow text-center">{t("Custom Gas Fee")}</div>
      </div>
      <div className="mb-16 mt-12">
        {"Set your own custom gas fee to control the priority and cost of your transaction."}
      </div>
      <div className="grid grid-cols-2 gap-8 gap-y-14">
        <Indicator label="Base Fee">
          {t("{{baseFee}} GWEI", { baseFee })}{" "}
          <WithTooltip
            className="inline-flex h-[1.5rem] flex-col justify-center align-text-top"
            tooltip={t("The base fee is set by the network and changes depending on network usage")}
          >
            <InfoIcon />
          </WithTooltip>
        </Indicator>
        <Indicator label={t("Base Fee Trend")}>
          <NetworkUsage baseFeeTrend={txDetails.baseFeeTrend} className="w-full justify-between" />
        </Indicator>
        <FormFieldContainer
          noErrorRow
          label={
            <span className="text-sm">
              {t("Max Base Fee")}{" "}
              <WithTooltip tooltip="The maximum base fee you are willing to pay to have this transaction confirmed. Selecting a value that's too low could prevent your transaction from ever being included in a block.">
                <InfoIcon className="inline align-text-top" />
              </WithTooltip>
            </span>
          }
        >
          <FormFieldInputText
            after={<span className="text-body-disabled text-sm">{t("GWEI")}</span>}
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
              {t("Max Priority Fee")}{" "}
              <WithTooltip
                tooltip={t(
                  "This fee is paid directly to miners to incentivise them to include your transaction in a block. The higher the Max Priority Fee, the faster your transaction will be confirmed"
                )}
              >
                <InfoIcon className="inline align-text-top" />
              </WithTooltip>
            </span>
          }
        >
          <FormFieldInputText
            after={<span className="text-body-disabled text-sm">{t("GWEI")}</span>}
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
            {t("Gas Limit")}{" "}
            <WithTooltip
              tooltip={t("The maximum amount of gas this transaction is allowed to consume")}
            >
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

      <div className="border-grey-700 text-body flex h-[5.2rem] w-full items-center justify-between rounded-sm border px-8 font-bold">
        <div>
          {t("Total Max Fee")}{" "}
          <WithTooltip
            tooltip={t(
              "The total maximum gas fee you are willing to pay for this transaction : (Max Base Fee + Max Priority Fee) * Gas Limit"
            )}
          >
            <InfoIcon className="inline-block align-text-top" />
          </WithTooltip>
        </div>
        <div>
          {totalMaxFee && showMaxFeeTotal ? (
            <TokensAndFiat planck={totalMaxFee.toString()} tokenId={tokenId} />
          ) : isLoadingGasSettingsValid ? (
            <LoaderIcon className="animate-spin-slow text-body-secondary inline-block" />
          ) : (
            <Tooltip>
              <TooltipTrigger className="text-alert-error">
                {t("Invalid transaction")}
              </TooltipTrigger>
              {!!gasSettingsError && (
                <TooltipContent>{getHumanReadableErrorMessage(gasSettingsError)}</TooltipContent>
              )}
            </Tooltip>
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
          {t("Save")}
        </Button>
      </div>
    </form>
  )
}
