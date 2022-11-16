import { BalanceFormatter } from "@core/domains/balances"
import Button from "@talisman/components/Button"
import { Drawer } from "@talisman/components/Drawer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { ExternalLinkIcon } from "@talisman/theme/icons"
import { scrollbarsStyle } from "@talisman/theme/styles"
import Fiat from "@ui/domains/Asset/Fiat"
import Tokens from "@ui/domains/Asset/Tokens"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useToken from "@ui/hooks/useToken"
import { BigNumber, BigNumberish } from "ethers"
import { formatEther, formatUnits } from "ethers/lib/utils"
import { FC, useCallback, useEffect, useMemo } from "react"
import styled from "styled-components"
import { PillButton } from "talisman-ui"
import { formatDecimals } from "talisman-utils"
import { Message } from "../Message"

import { useEthSignTransactionRequest } from "../SignRequestContext"
import { ViewDetailsField } from "./ViewDetailsField"

const ViewDetailsContainer = styled.div`
  background: var(--color-background);
  padding: 2.4rem;
  border-radius: 2.4rem 2.4rem 0px 0px;
  font-size: var(--font-size-small);
  line-height: 2rem;
  display: flex;
  flex-direction: column;
  max-height: 60rem;

  .grow {
    flex-grow: 1;
    overflow-y: auto;
    ${scrollbarsStyle()}
  }

  color: var(--color-foreground-muted-2x);
  .title {
    color: var(--color-mid);
  }

  .title {
    margin-bottom: 1.6rem;
  }

  button {
    margin-top: 2.4rem;
    width: 100%;
  }

  .error {
    color: var(--color-status-error);
  }

  .warning {
    color: var(--color-status-warning);
  }

  a:link,
  a:visited {
    transition: none;
    color: var(--color-foreground-muted-2x);
  }
  a:hover,
  a:active {
    color: var(--color-foreground);
  }
`

type ViewDetailsContentProps = {
  onClose: () => void
}

type AddressProps = {
  address?: string
}
const Address = ({ address }: AddressProps) => {
  const { network } = useEthSignTransactionRequest()
  const blockExplorerUrl = useMemo(() => network?.explorerUrl, [network?.explorerUrl])

  if (!address) return null

  if (!blockExplorerUrl) return <>{address}</>

  return (
    <a href={`${blockExplorerUrl}/address/${address}`} target="_blank" rel="noreferrer">
      <span>{address}</span>{" "}
      <span className="inline-flex h-10 flex-col justify-center">
        <ExternalLinkIcon className="inline-block transition-none" />
      </span>
    </a>
  )
}

const formatGwei = (value?: BigNumberish) => {
  return value ? `${formatDecimals(formatUnits(value, "gwei"))} GWEI` : null
}

const ViewDetailsContent: FC<ViewDetailsContentProps> = ({ onClose }) => {
  const {
    request,
    network,
    networkUsage,
    txDetails,
    priority,
    transaction,
    transactionInfo,
    error,
  } = useEthSignTransactionRequest()
  const { genericEvent } = useAnalytics()

  const txInfo = useMemo(() => {
    if (transactionInfo && transactionInfo.contractType !== "unknown") return transactionInfo
    return undefined
  }, [transactionInfo])

  const nativeToken = useToken(network?.nativeToken?.id)
  const formatEthValue = useCallback(
    (value?: BigNumberish) => {
      return value ? `${formatEther(value)} ${nativeToken?.symbol ?? ""}` : null
    },
    [nativeToken?.symbol]
  )

  useEffect(() => {
    genericEvent("open sign transaction view details", { type: "ethereum" })
  }, [genericEvent])

  const estimatedFee = useMemo(
    () =>
      txDetails && nativeToken
        ? new BalanceFormatter(
            BigNumber.from(txDetails?.estimatedFee).toString(),
            nativeToken?.decimals,
            nativeToken?.rates
          )
        : null,
    [nativeToken, txDetails]
  )

  return (
    <ViewDetailsContainer>
      <div className="grow">
        <div className="title">Details</div>
        {/* TODO explain what the method does */}
        <ViewDetailsField label="Network">
          {network ? `${network.name} (${network.id})` : null}
        </ViewDetailsField>
        <ViewDetailsField label="Contract Type">{txInfo?.contractType ?? "N/A"}</ViewDetailsField>
        <ViewDetailsField label="Method">{txInfo?.contractCall?.name ?? "N/A"}</ViewDetailsField>
        <ViewDetailsField label="From" breakAll>
          <Address address={request.from} />
        </ViewDetailsField>
        <ViewDetailsField label="To" breakAll>
          <Address address={request.to} />
        </ViewDetailsField>
        <ViewDetailsField label="Value to be transferred" breakAll>
          {formatEthValue(request.value)}
        </ViewDetailsField>

        <ViewDetailsField label="Network usage">
          {networkUsage ? `${Math.round(networkUsage * 100)}%` : "N/A"}
        </ViewDetailsField>
        <ViewDetailsField label="Estimated gas units">
          {txDetails?.estimatedGas ? BigNumber.from(txDetails?.estimatedGas).toNumber() : "N/A"}
        </ViewDetailsField>
        <ViewDetailsField label="Gas Limit">
          {transaction?.gasLimit ? BigNumber.from(transaction.gasLimit)?.toNumber() : "N/A" || null}
        </ViewDetailsField>
        {transaction?.type === 2 ? (
          <>
            <ViewDetailsField label="Base fee per gas">
              {txDetails?.baseFeePerGas ? formatGwei(txDetails.baseFeePerGas) : "N/A"}
            </ViewDetailsField>
            <ViewDetailsField label={`Max priority fee per gas (${priority} priority)`}>
              {transaction.maxPriorityFeePerGas
                ? formatGwei(transaction.maxPriorityFeePerGas)
                : "N/A"}
            </ViewDetailsField>
            <ViewDetailsField label={`Max fee per gas`}>
              {transaction.maxFeePerGas ? formatGwei(transaction.maxFeePerGas) : "N/A"}
            </ViewDetailsField>
          </>
        ) : (
          <>
            <ViewDetailsField label="Gas price">
              {transaction?.gasPrice ? formatGwei(transaction.gasPrice) : "N/A"}
            </ViewDetailsField>
          </>
        )}
        <ViewDetailsField label="Total Fee Estimate">
          {estimatedFee?.tokens ? (
            <Tokens
              amount={estimatedFee?.tokens}
              decimals={nativeToken?.decimals}
              symbol={nativeToken?.symbol}
            />
          ) : (
            "N/A"
          )}
          {estimatedFee && nativeToken?.rates ? (
            <>
              {" "}
              / <Fiat amount={estimatedFee?.fiat("usd")} noCountUp currency="usd" />
            </>
          ) : null}
        </ViewDetailsField>
        <ViewDetailsField label="Error" error={error} />
        {request.data && (
          <ViewDetailsField label="Byte code">
            <Message
              readOnly
              rows={6}
              className="w-full rounded-sm"
              value={request.data?.toString()}
            />
          </ViewDetailsField>
        )}
      </div>
      <Button onClick={onClose}>Close</Button>
    </ViewDetailsContainer>
  )
}

export const ViewDetailsEth = () => {
  const { isOpen, open, close } = useOpenClose()
  const { isLoading } = useEthSignTransactionRequest()

  return (
    <>
      <PillButton size="sm" onClick={open}>
        View Details
      </PillButton>
      <Drawer anchor="bottom" open={isOpen && !isLoading} onClose={close}>
        <ViewDetailsContent onClose={close} />
      </Drawer>
    </>
  )
}
