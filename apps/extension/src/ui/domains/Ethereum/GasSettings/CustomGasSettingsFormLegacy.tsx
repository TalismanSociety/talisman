import { getHumanReadableErrorMessage } from "@extension/core"
import { EthGasSettingsLegacy, EvmNetworkId } from "@extension/core"
import { EthTransactionDetails, GasSettingsByPriorityLegacy } from "@extension/core"
import { log } from "@extension/shared"
import { yupResolver } from "@hookform/resolvers/yup"
import { notify } from "@talisman/components/Notifications"
import { WithTooltip } from "@talisman/components/Tooltip"
import { ArrowRightIcon, InfoIcon, LoaderIcon } from "@talismn/icons"
import { formatDecimals } from "@talismn/util"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { FC, FormEventHandler, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useDebounce } from "react-use"
import { IconButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import { TransactionRequest, formatGwei, parseGwei } from "viem"
import * as yup from "yup"

import { useIsValidEthTransaction } from "../useIsValidEthTransaction"
import { usePublicClient } from "../usePublicClient"
import { Indicator, MessageRow } from "./common"

const INPUT_PROPS = {
  className: "bg-grey-700 px-6 gap-6 h-[5rem]",
}

type FormData = {
  gasPriceGwei: string
  gasLimit: number
}

const gasSettingsFromFormData = (formData: FormData): EthGasSettingsLegacy => ({
  type: "legacy",
  gasPrice: parseGwei(formData.gasPriceGwei),
  gas: BigInt(formData.gasLimit),
})

const isValidGweiInput =
  (min: bigint = 0n) =>
  (value?: string) => {
    try {
      return !!value && parseGwei(value) >= min
    } catch (err) {
      return false
    }
  }

const schema = yup
  .object({
    gasPriceGwei: yup
      .string()
      .required()
      .test("gasPriceValid", "Invalid max base fee", isValidGweiInput(0n)), // 0 is sometimes necessary (ex: claiming bridged assets on polygon zkEVM)
    gasLimit: yup.number().required().integer().min(21000),
  })
  .required()

const useIsValidGasSettings = (
  evmNetworkId: EvmNetworkId,
  tx: TransactionRequest,
  gasPriceGwei: string,
  gasLimit: number
) => {
  const [debouncedFormData, setDebouncedFormData] = useState<FormData>({
    gasPriceGwei,
    gasLimit,
  })

  // isLoading buffer for debounce
  // prevents UI from displaying a new total max fee before it's validated from chain
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
  }, [gasPriceGwei, gasLimit])

  useDebounce(
    () => {
      setDebouncedFormData({ gasPriceGwei, gasLimit })
      setIsLoading(false)
    },
    250,
    [gasPriceGwei, gasLimit]
  )

  const provider = usePublicClient(evmNetworkId)

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
    provider,
    txPrepared,
    "custom"
  )

  return {
    isLoading: isLoading || isValidationLoading,
    ...rest,
  }
}

type CustomGasSettingsFormLegacyProps = {
  networkUsage?: number
  tx: TransactionRequest
  tokenId: string
  txDetails: EthTransactionDetails
  gasSettingsByPriority: GasSettingsByPriorityLegacy
  onConfirm: (gasSettings: EthGasSettingsLegacy) => void
  onCancel: () => void
}

export const CustomGasSettingsFormLegacy: FC<CustomGasSettingsFormLegacyProps> = ({
  tx,
  tokenId,
  gasSettingsByPriority,
  networkUsage,
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

  const customSettings = gasSettingsByPriority.custom

  const networkGasPrice = useMemo(
    () =>
      formatDecimals(formatGwei(txDetails.gasPrice), undefined, {
        notation: "standard",
      }),
    [txDetails.gasPrice]
  )

  const defaultValues: FormData = useMemo(
    () => ({
      gasPriceGwei: formatGwei(customSettings.gasPrice),
      gasLimit: Number(customSettings.gas),
    }),
    [customSettings.gas, customSettings.gasPrice]
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
    setValue("gasPriceGwei", defaultValues.gasPriceGwei, {
      shouldTouch: true,
      shouldValidate: true,
    })
    setValue("gasLimit", defaultValues.gasLimit, { shouldTouch: true, shouldValidate: true })
    refInitialized.current = true
  }, [defaultValues, setValue])

  const { gasPriceGwei, gasLimit } = watch()

  const totalMaxFee = useMemo(() => {
    try {
      return parseGwei(gasPriceGwei) * BigInt(gasLimit)
    } catch (err) {
      return null
    }
  }, [gasLimit, gasPriceGwei])

  const { warningFee, errorGasLimit } = useMemo(() => {
    let warningFee = ""
    let errorGasLimit = ""

    try {
      if (errors.gasPriceGwei) warningFee = t("Gas price is invalid")
      else if (gasPriceGwei && parseGwei(gasPriceGwei) < txDetails.gasPrice)
        warningFee = t("Gas price seems too low for current network conditions")
      else if (gasPriceGwei && parseGwei(gasPriceGwei) > txDetails.gasPrice * 2n)
        warningFee = t("Gas price seems higher than required")

      if (errors.gasLimit?.type === "min") errorGasLimit = t("Gas Limit minimum value is 21000")
      else if (errors.gasLimit) errorGasLimit = t("Gas Limit is invalid")
      else if (txDetails.estimatedGas > BigInt(gasLimit))
        errorGasLimit = t("Gas Limit too low, transaction likely to fail")
    } catch (err) {
      // parse error : form will be invalid, ignore
      log.error("Failed set warningFee & errorGasLimit", { err })
    }

    return {
      warningFee,
      errorGasLimit,
    }
  }, [
    errors.gasLimit,
    errors.gasPriceGwei,
    gasLimit,
    gasPriceGwei,
    txDetails.estimatedGas,
    txDetails.gasPrice,
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
  } = useIsValidGasSettings(txDetails.evmNetworkId, tx, gasPriceGwei, gasLimit)

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
        {t("Set your own custom gas fee to control the priority and cost of your transaction.")}
      </div>
      <div className="mb-14 grid w-full grid-cols-2 gap-8">
        <Indicator label={t("Network Gas Price")}>
          {t("{{networkGasPrice}} GWEI", { networkGasPrice })}{" "}
          <WithTooltip
            className="inline-flex h-[1.5rem] flex-col justify-center align-text-top"
            tooltip={t(
              "The Gas Price is set by the network and changes depending on network usage"
            )}
          >
            <InfoIcon />
          </WithTooltip>
        </Indicator>
        {networkUsage !== undefined && (
          <Indicator label={t("Network Usage")}>{Math.round(networkUsage * 100)} %</Indicator>
        )}
      </div>
      <FormFieldContainer
        noErrorRow
        className="w-full"
        label={
          <span className="text-sm">
            {t("Gas Price")}{" "}
            <WithTooltip tooltip={t("The fee you are willing to pay for each gas unit")}>
              <InfoIcon className="inline align-text-top" />
            </WithTooltip>
          </span>
        }
      >
        {/* TODO implement controler for number format with 9 digits maximum https://stackoverflow.com/questions/69370034/how-to-input-only-number-in-react-hook-form */}
        <FormFieldInputText
          after={<span className="text-body-disabled text-sm">{t("GWEI")}</span>}
          containerProps={INPUT_PROPS}
          {...register("gasPriceGwei")}
        />
      </FormFieldContainer>
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
              "The total maximum gas fee you are willing to pay for this transaction : Gas Price * Gas Limit"
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
