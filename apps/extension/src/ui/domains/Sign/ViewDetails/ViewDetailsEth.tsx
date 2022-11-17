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

  const [estimatedFee, maximumFee] = useMemo(
    () =>
      txDetails && nativeToken
        ? [
            new BalanceFormatter(
              BigNumber.from(txDetails?.estimatedFee).toString(),
              nativeToken?.decimals,
              nativeToken?.rates
            ),
            new BalanceFormatter(
              BigNumber.from(txDetails?.maxFee).toString(),
              nativeToken?.decimals,
              nativeToken?.rates
            ),
          ]
        : [null, null],
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
        <ViewDetailsField label="Contract type and method">
          {txInfo?.contractType
            ? `${txInfo?.contractType} : ${txInfo?.contractCall?.name ?? "N/A"}`
            : "N/A"}
        </ViewDetailsField>
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
        <ViewDetailsField label="Estimated gas">
          {txDetails?.estimatedGas ? BigNumber.from(txDetails?.estimatedGas).toNumber() : "N/A"}
        </ViewDetailsField>
        <ViewDetailsField label={"Gas settings"}>
          {transaction ? (
            <div className="grid-cols-keyvalue grid gap-x-8 whitespace-nowrap">
              <div>Gas limit</div>
              <div>
                {transaction?.gasLimit ? BigNumber.from(transaction.gasLimit)?.toNumber() : "N/A"}
              </div>
              {transaction?.type === 2 ? (
                <>
                  <div>Base fee per gas</div>
                  <div>
                    {txDetails?.baseFeePerGas ? formatGwei(txDetails.baseFeePerGas) : "N/A"}
                  </div>
                  <div>Priority</div>
                  <div>{priority}</div>
                  <div>Max priority fee per gas</div>
                  <div>
                    {transaction.maxPriorityFeePerGas
                      ? formatGwei(transaction.maxPriorityFeePerGas)
                      : "N/A"}
                  </div>
                  <div>Max fee per gas</div>
                  <div>
                    {transaction.maxFeePerGas ? formatGwei(transaction.maxFeePerGas) : "N/A"}
                  </div>
                </>
              ) : (
                <>
                  <div>Gas price</div>
                  <div>{transaction?.gasPrice ? formatGwei(transaction.gasPrice) : "N/A"}</div>
                </>
              )}
            </div>
          ) : (
            "N/A"
          )}
        </ViewDetailsField>
        <ViewDetailsField label="Total Fee">
          {transaction ? (
            <div className="grid-cols-keyvalue grid gap-x-8 whitespace-nowrap">
              <div>Estimated</div>
              <div>
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
              </div>
              <div>Maximum</div>
              <div>
                {maximumFee?.tokens ? (
                  <Tokens
                    amount={maximumFee?.tokens}
                    decimals={nativeToken?.decimals}
                    symbol={nativeToken?.symbol}
                  />
                ) : (
                  "N/A"
                )}
                {maximumFee && nativeToken?.rates ? (
                  <>
                    {" "}
                    / <Fiat amount={maximumFee?.fiat("usd")} noCountUp currency="usd" />
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            "N/A"
          )}
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
