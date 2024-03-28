import { BalanceFormatter } from "@extension/core"
import { TOKEN_APPROVALS_URL, log } from "@extension/shared"
import { yupResolver } from "@hookform/resolvers/yup"
import { assert } from "@polkadot/util"
import { notify } from "@talisman/components/Notifications"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { Address } from "@talismn/balances"
import { EditIcon } from "@talismn/icons"
import { formatDecimals, planckToTokens, tokensToPlanck } from "@talismn/util"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useErc20Token } from "@ui/hooks/useErc20Token"
import useToken from "@ui/hooks/useToken"
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
import { hexToBigInt, toHex } from "viem"
import * as yup from "yup"

import { SignAlertMessage } from "../SignAlertMessage"
import { SignContainer } from "../SignContainer"
import { SignViewBodyShimmer } from "../Views/SignViewBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { SignParamErc20TokenButton } from "./shared/SignParamErc20TokenButton"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"

type Erc20TokenInfo = {
  contractAddress: string
  decimals: number
  symbol: string
}

const EditAllowanceButton: FC<{
  onClick: () => void
  isInfinite: boolean
  allowance: BalanceFormatter | null | undefined
  fiat: number | null | undefined
  symbol: string
}> = ({ onClick, allowance, isInfinite, fiat, symbol }) => (
  <Tooltip>
    <TooltipTrigger>
      <PillButton
        size="sm"
        onClick={onClick}
        className="ml-4 whitespace-nowrap [&>div]:flex [&>div]:items-center"
      >
        <span>{isInfinite ? "infinite" : formatDecimals(allowance?.tokens)}</span>
        <EditIcon className="ml-4 inline-block h-7 w-7" />
      </PillButton>
    </TooltipTrigger>
    {!!allowance && !isInfinite && (
      <TooltipContent>
        <div className="text-right">
          <div>
            {allowance.tokens} {symbol}
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
)

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
  onSetLimit: (limit: bigint) => void
}> = ({ token, spender, allowance, onSetLimit, onCancel }) => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  // const handleSetLimitClick = useCallback(() => {
  //   onSetLimit("100")
  // }, [onSetLimit])

  const schema = useMemo(
    () =>
      yup.object({
        limit: yup.string().test("limit", "Invalid amount", isValidAmount(token.decimals)),
      }),
    [token]
  )

  const defaultValues = useMemo(
    () => ({ limit: planckToTokens(allowance.toString(), token.decimals) }),
    [allowance, token.decimals]
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues,
  })

  const submit = useCallback(
    async (formData: FormData) => {
      try {
        genericEvent("set custom allowance")
        if (formData.limit === "") return onSetLimit(hexToBigInt(ALLOWANCE_UNLIMITED))
        onSetLimit(BigInt(tokensToPlanck(formData.limit, token.decimals)))
      } catch (err) {
        log.error("Failed to set custom gas settings", { err })
        notify({ title: "Error", subtitle: (err as Error).message, type: "error" })
      }
    },
    [genericEvent, onSetLimit, token.decimals]
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

  const INPUT_PROPS: FormFieldInputContainerProps = {
    className: "bg-grey-700 px-6",
  }

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
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Button onClick={onCancel}>{t("Cancel")}</Button>
        <Button type="submit" className="disabled:bg-grey-750" primary disabled={!isValid}>
          {t("Set Limit")}
        </Button>
      </div>
    </form>
  )
}

const EditAllowanceDrawer: FC<{
  token: Erc20TokenInfo
  spender: string
  allowance: bigint
  isOpen: boolean
  onSetLimit: (limit: bigint) => void
  onClose: () => void
}> = ({ token, spender, allowance, isOpen, onSetLimit, onClose }) => {
  return (
    <Drawer anchor="bottom" containerId="main" isOpen={isOpen} onDismiss={onClose}>
      <EditAllowanceForm
        token={token}
        spender={spender}
        allowance={allowance}
        onCancel={onClose}
        onSetLimit={onSetLimit}
      />
    </Drawer>
  )
}

const ALLOWANCE_UNLIMITED = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

export const EthSignBodyErc20Approve: FC = () => {
  const { t } = useTranslation("request")
  const { account, network, decodedTx } = useEthSignKnownTransactionRequest()

  const token = useErc20Token(network?.id, decodedTx.targetAddress)
  const tokenRates = useTokenRates(token?.id)
  const currency = useSelectedCurrency()

  const erc20Token = useMemo<Erc20TokenInfo | null>(
    () =>
      decodedTx.asset?.symbol && decodedTx.targetAddress
        ? {
            contractAddress: decodedTx.targetAddress,
            decimals: decodedTx.asset.decimals,
            symbol: decodedTx.asset.symbol,
          }
        : null,
    [decodedTx.asset, decodedTx.targetAddress]
  )

  const allowanceDrawer = useOpenClose()

  const handleSetLimit = useCallback((limit: bigint) => {
    log.log({ limit })
  }, [])

  const nativeToken = useToken(network?.nativeToken?.id)

  const { spender, allowance, isInfinite, isRevoke } = useMemo(() => {
    assert(decodedTx.asset?.decimals !== undefined, "missing asset decimals")
    const rawAllowance = getContractCallArg<bigint>(decodedTx, "amount")
    const isInfinite = toHex(rawAllowance) === ALLOWANCE_UNLIMITED

    return {
      spender: getContractCallArg<string>(decodedTx, "spender"),
      allowance:
        rawAllowance && !isInfinite
          ? new BalanceFormatter(rawAllowance.toString(), decodedTx.asset.decimals, tokenRates)
          : undefined,
      isInfinite,
      isRevoke: rawAllowance === 0n,
    }
  }, [decodedTx, tokenRates])

  if (!nativeToken || !spender || !account || !network || !erc20Token)
    return <SignViewBodyShimmer />

  return (
    <SignContainer
      networkType="ethereum"
      title={
        isRevoke ? (
          t("Revoke access")
        ) : (
          <Trans t={t}>
            This app wants to
            <br />
            access your funds
          </Trans>
        )
      }
      alert={
        isRevoke ? null : (
          <SignAlertMessage>
            <span className="text-body-secondary">
              {t(
                "This contract will have permission to spend tokens on your behalf until manually revoked."
              )}
            </span>{" "}
            <a className="text-white" href={TOKEN_APPROVALS_URL} target="_blank">
              {t("Learn more")}
            </a>
          </SignAlertMessage>
        )
      }
    >
      <div className="flex">
        <div>{isRevoke ? t("Disallow") : t("Allow")}</div>
        <SignParamNetworkAddressButton network={network} address={spender} />
      </div>
      <div className="flex items-center">
        <div>{isRevoke ? t("from spending") : t("to spend")}</div>
        {!isRevoke && (
          <EditAllowanceButton
            allowance={allowance}
            isInfinite={isInfinite}
            fiat={allowance?.fiat(currency)}
            symbol={erc20Token.symbol}
            onClick={allowanceDrawer.open}
          />
        )}
        <SignParamErc20TokenButton
          address={erc20Token.contractAddress}
          asset={erc20Token}
          network={network}
          withIcon
        />
      </div>
      <div className="flex">
        <div>{t("from")}</div>
        <SignParamAccountButton address={account.address} explorerUrl={network.explorerUrl} />
      </div>
      {!!allowance?.planck && (
        <EditAllowanceDrawer
          token={erc20Token}
          spender={spender}
          allowance={allowance.planck}
          onSetLimit={handleSetLimit}
          isOpen={allowanceDrawer.isOpen}
          onClose={allowanceDrawer.close}
        />
      )}
    </SignContainer>
  )
}
