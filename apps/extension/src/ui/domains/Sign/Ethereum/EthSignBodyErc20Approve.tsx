import { BalanceFormatter } from "@extension/core"
import { TOKEN_APPROVALS_URL, log } from "@extension/shared"
import { assert } from "@polkadot/util"
import { EditIcon } from "@talismn/icons"
import { formatDecimals } from "@talismn/util"
import { useErc20Token } from "@ui/hooks/useErc20Token"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { FC, useCallback, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Drawer, useOpenClose } from "talisman-ui"
import { toHex } from "viem"

import { SignAlertMessage } from "../SignAlertMessage"
import { SignContainer } from "../SignContainer"
import { SignViewBodyShimmer } from "../Views/SignViewBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { SignParamErc20TokenButton } from "./shared/SignParamErc20TokenButton"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"

const EditAllowanceDrawer: FC<{
  isOpen: boolean
  onSetLimit: (limit: string) => void
  onClose: () => void
}> = ({ isOpen, onSetLimit, onClose }) => {
  const handleSetLimitClick = useCallback(() => {
    onSetLimit("100")
  }, [onSetLimit])

  return (
    <Drawer anchor="bottom" containerId="main" isOpen={isOpen} onDismiss={onClose}>
      hi
      <button onClick={handleSetLimitClick}>set limit</button>
    </Drawer>
  )
}

const ALLOWANCE_UNLIMITED = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

export const EthSignBodyErc20Approve: FC = () => {
  const { t } = useTranslation("request")
  const { account, network, decodedTx } = useEthSignKnownTransactionRequest()

  const token = useErc20Token(network?.id, decodedTx.targetAddress)
  const tokenRates = useTokenRates(token?.id)

  // const { symbol } = useMemo(() => {
  //   assert(decodedTx.asset?.symbol, "missing asset symbol")
  //   const symbol = token?.symbol ?? (decodedTx.asset.symbol as string)

  //   return { symbol }
  // }, [token?.symbol, decodedTx.asset?.symbol])

  const allowanceDrawer = useOpenClose()

  const handleSetLimit = useCallback((limit: string) => {
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

  if (
    !nativeToken ||
    !spender ||
    !account ||
    !network ||
    !decodedTx.targetAddress ||
    !decodedTx.asset?.symbol ||
    decodedTx.asset?.decimals === undefined
  )
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
        <button
          type="button"
          className="bg-grey-800 outline-body-secondary hover:bg-grey-750 hover:text-grey-300 my-1 ml-4 flex items-center rounded-lg px-5 py-2 focus-visible:outline"
          onClick={allowanceDrawer.open}
        >
          <span className="truncate text-sm">
            {isInfinite ? "infinite" : formatDecimals(allowance?.tokens)}
          </span>
          <EditIcon className="ml-4 h-7 w-7" />
        </button>
        <SignParamErc20TokenButton
          address={decodedTx.targetAddress}
          asset={decodedTx.asset}
          // asset={{
          //   symbol: "DOUBLOON",
          // }}
          network={network}
          withIcon
        />
      </div>
      <div className="flex">
        <div>{t("from")}</div>
        <SignParamAccountButton address={account.address} explorerUrl={network.explorerUrl} />
      </div>
      <EditAllowanceDrawer
        onSetLimit={handleSetLimit}
        isOpen={allowanceDrawer.isOpen}
        onClose={allowanceDrawer.close}
      />
    </SignContainer>
  )
}
