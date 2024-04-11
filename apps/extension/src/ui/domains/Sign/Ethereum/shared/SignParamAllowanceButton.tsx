import { BalanceFormatter, EvmAddress, EvmNetworkId } from "@extension/core"
import { log } from "@extension/shared"
import { yupResolver } from "@hookform/resolvers/yup"
import { notify } from "@talisman/components/Notifications"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { Address } from "@talismn/balances"
import { EditIcon } from "@talismn/icons"
import { formatDecimals, tokensToPlanck } from "@talismn/util"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useErc20Token } from "@ui/hooks/useErc20Token"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { FC, FormEventHandler, useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import {
  Button,
  Drawer,
  FormFieldContainer,
  FormFieldInputContainerProps,
  FormFieldInputText,
  PillButton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useOpenClose,
} from "talisman-ui"
import { formatUnits, hexToBigInt, parseUnits } from "viem"
import * as yup from "yup"

export const ERC20_UNLIMITED_ALLOWANCE = hexToBigInt(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
)

const INPUT_PROPS: FormFieldInputContainerProps = {
  className: "bg-grey-700 px-6",
}

type Erc20TokenInfo = {
  evmNetworkId: EvmNetworkId
  contractAddress: EvmAddress
  decimals: number
  symbol: string
}

type FormData = {
  limit: string
}

const isValidAmount =
  (decimals: number) =>
  (value: string = "") => {
    if (value === "") return true // Unlimited
    try {
      return BigInt(tokensToPlanck(value, decimals)) > 0n
    } catch (err) {
      return false
    }
  }

const EditAllowanceForm: FC<{
  token: Erc20TokenInfo
  spender: Address
  allowance: bigint
  onCancel: () => void
  onSubmit: (limit: bigint) => void | Promise<void>
}> = ({ token, spender, allowance, onSubmit, onCancel }) => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  const schema = useMemo(
    () =>
      yup.object({
        limit: yup.string().test("limit", "Invalid amount", isValidAmount(token.decimals)),
      }),
    [token]
  )

  const defaultValues = useMemo(
    () => ({
      limit: allowance === ERC20_UNLIMITED_ALLOWANCE ? "" : formatUnits(allowance, token.decimals),
    }),
    [allowance, token.decimals]
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid, isDirty, isSubmitting },
  } = useForm<FormData>({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues,
  })

  const submit = useCallback(
    async ({ limit }: FormData) => {
      try {
        genericEvent("set custom allowance")
        const newLimit = limit ? parseUnits(limit, token.decimals) : ERC20_UNLIMITED_ALLOWANCE
        await onSubmit(newLimit)
      } catch (err) {
        log.error("Failed to set custom gas settings", { err })
        notify({ title: "Error", subtitle: (err as Error).message, type: "error" })
      }
    },
    [genericEvent, onSubmit, token.decimals]
  )

  // don't bubble up submit event to the parent approval form
  const submitWithoutBubbleUp: FormEventHandler<HTMLFormElement> = useCallback(
    (e) => {
      e.preventDefault()
      handleSubmit(submit)(e)
      e.stopPropagation()
    },
    [handleSubmit, submit]
  )

  const handleUnlimitedClick = useCallback(() => {
    setValue("limit", "", { shouldValidate: true, shouldDirty: true, shouldTouch: true })
  }, [setValue])

  const limit = watch("limit")

  return (
    <form onSubmit={submitWithoutBubbleUp} className="bg-grey-800 rounded-t-xl p-12 ">
      <div className="text-center font-bold">{t("Edit spending limit")}</div>
      <p className="text-body-secondary my-12 text-sm">
        <Trans
          components={{
            Highlight: <span className="text-body"></span>,
          }}
          defaults="Set the max amount <Highlight>{{address}}</Highlight> can spend of your <Highlight>{{symbol}}</Highlight>."
          values={{ address: shortenAddress(spender), symbol: token.symbol }}
        />
      </p>
      <FormFieldContainer
        label={<span className="text-sm">{t("Max spending limit")}</span>}
        error={errors.limit?.message}
      >
        <FormFieldInputText
          after={
            <div className="flex items-center gap-4">
              <span className="text-body-disabled">{token.symbol}</span>
              <PillButton
                disabled={limit === ""}
                onClick={handleUnlimitedClick}
                className="hover:bg-grey-750"
              >
                {t("Unlimited")}
              </PillButton>
            </div>
          }
          placeholder={t("Unlimited")}
          containerProps={INPUT_PROPS}
          {...register("limit")}
        />
      </FormFieldContainer>
      <div className="mt-4 grid grid-cols-2 gap-12">
        <Button onClick={onCancel}>{t("Cancel")}</Button>
        <Button
          type="submit"
          className="disabled:bg-grey-750"
          primary
          disabled={!isValid || !isDirty}
          processing={isSubmitting}
        >
          {t("Set Limit")}
        </Button>
      </div>
    </form>
  )
}

export const SignParamAllowanceButton: FC<{
  spender: EvmAddress
  allowance: bigint
  token: Erc20TokenInfo
  onChange: (limit: bigint) => void | Promise<void>
}> = ({ spender, allowance, token, onChange }) => {
  const { isOpen, open, close } = useOpenClose()

  const erc20 = useErc20Token(token.evmNetworkId, token.contractAddress)
  const tokenRates = useTokenRates(erc20?.id)
  const currency = useSelectedCurrency()

  const fiat = useMemo(() => {
    const balAllowance =
      allowance !== ERC20_UNLIMITED_ALLOWANCE
        ? new BalanceFormatter(allowance.toString(), token.decimals, tokenRates)
        : undefined
    return balAllowance?.fiat(currency)
  }, [allowance, currency, token.decimals, tokenRates])

  const isInfinite = useMemo(() => allowance === ERC20_UNLIMITED_ALLOWANCE, [allowance])
  const tokens = useMemo(() => formatUnits(allowance, token.decimals), [allowance, token])

  const handleSubmit = useCallback(
    (limit: bigint) => {
      onChange(limit)
      close()
    },
    [close, onChange]
  )

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <PillButton
            size="sm"
            onClick={open}
            className="ml-4 whitespace-nowrap [&>div]:flex [&>div]:items-center"
          >
            <span>{isInfinite ? "infinite" : formatDecimals(tokens)}</span>
            <EditIcon className="ml-4 inline-block h-7 w-7" />
          </PillButton>
        </TooltipTrigger>
        {!!allowance && !isInfinite && (
          <TooltipContent>
            <div className="text-right">
              <div>
                {tokens} {token.symbol}
              </div>
              {!!fiat && (
                <div>
                  <Fiat amount={fiat} noCountUp />
                </div>
              )}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
      <Drawer anchor="bottom" containerId="main" isOpen={isOpen} onDismiss={close}>
        <EditAllowanceForm
          token={token}
          spender={spender}
          allowance={allowance}
          onCancel={close}
          onSubmit={handleSubmit}
        />
      </Drawer>
    </>
  )
}
