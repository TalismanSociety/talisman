import { TOKEN_APPROVALS_URL } from "@core/constants"
import { BalanceFormatter } from "@core/domains/balances"
import { CustomErc20Token } from "@core/domains/tokens/types"
import { assert } from "@polkadot/util"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import useTokens from "@ui/hooks/useTokens"
import { FC, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { toHex } from "viem"

import { SignAlertMessage } from "../SignAlertMessage"
import { SignContainer } from "../SignContainer"
import { SignViewBodyShimmer } from "../Views/SignViewBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import {
  SignParamAccountButton,
  SignParamNetworkAddressButton,
  SignParamTokensButton,
} from "./shared"
import { SignParamErc20TokenButton } from "./shared/SignParamErc20TokenButton"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"

const ALLOWANCE_UNLIMITED = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

export const EthSignBodyErc20Approve: FC = () => {
  const { t } = useTranslation("request")
  const { account, network, decodedTx } = useEthSignKnownTransactionRequest()

  const { tokens } = useTokens({ activeOnly: false, includeTestnets: true })
  const token = useMemo(() => {
    return network
      ? (tokens?.find(
          (t) =>
            t.type === "evm-erc20" &&
            t.evmNetwork?.id === network.id &&
            t.contractAddress === decodedTx.targetAddress
        ) as CustomErc20Token)
      : undefined
  }, [network, tokens, decodedTx.targetAddress])

  const tokenRates = useTokenRates(token?.id)

  const { symbol } = useMemo(() => {
    assert(decodedTx.asset?.symbol, "missing asset symbol")
    const symbol = token?.symbol ?? (decodedTx.asset.symbol as string)

    return { symbol }
  }, [token?.symbol, decodedTx.asset?.symbol])

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
      <div className="flex">
        <div>
          {isRevoke ? t("from spending") : isInfinite ? t("to spend infinite") : t("to spend")}
        </div>
        {allowance ? (
          <SignParamTokensButton
            address={decodedTx.targetAddress}
            network={network}
            tokenId={token?.id}
            erc20={{ evmNetworkId: network.id, contractAddress: decodedTx.targetAddress }}
            tokens={allowance.tokens}
            decimals={decodedTx.asset.decimals}
            symbol={symbol}
            fiat={allowance}
            withIcon
          />
        ) : (
          <SignParamErc20TokenButton
            address={decodedTx.targetAddress}
            asset={decodedTx.asset}
            network={network}
            withIcon
          />
        )}
      </div>
      <div className="flex">
        <div>{t("from")}</div>
        <SignParamAccountButton address={account.address} explorerUrl={network.explorerUrl} />
      </div>
    </SignContainer>
  )
}
