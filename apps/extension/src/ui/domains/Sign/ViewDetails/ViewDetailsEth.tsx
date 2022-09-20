import Button from "@talisman/components/Button"
import { Drawer } from "@talisman/components/Drawer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { scrollbarsStyle } from "@talisman/theme/styles"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useToken from "@ui/hooks/useToken"
import { BigNumber, BigNumberish } from "ethers"
import { formatEther } from "ethers/lib/utils"
import { FC, useCallback, useEffect, useMemo } from "react"
import styled from "styled-components"

import { useEthSignTransactionRequest } from "../SignRequestContext"
import { ViewDetailsButton } from "./ViewDetailsButton"
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
      {address}
    </a>
  )
}

const ViewDetailsContent: FC<ViewDetailsContentProps> = ({ onClose }) => {
  const { request, network, gasInfo, priority, transaction } = useEthSignTransactionRequest()
  const { genericEvent } = useAnalytics()

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

  if (!transaction || !gasInfo) return null

  return (
    <ViewDetailsContainer>
      <div className="grow">
        <div className="title">Details</div>
        <ViewDetailsField label="From" breakAll>
          <Address address={request.from} />
        </ViewDetailsField>
        <ViewDetailsField label="To" breakAll>
          <Address address={request.to} />
        </ViewDetailsField>
        <ViewDetailsField label="Value to be transferred" breakAll>
          {formatEthValue(request.value)}
        </ViewDetailsField>
        <ViewDetailsField label="Network">{network?.name ?? "Unknown"}</ViewDetailsField>
        <ViewDetailsField label="Network usage">
          {Math.round((gasInfo?.gasUsedRatio ?? 0) * 100)}%
        </ViewDetailsField>
        <ViewDetailsField label="Estimated gas &amp; price per gas">
          {gasInfo.estimatedGas?.toNumber() || null} gas at {formatEthValue(gasInfo?.gasPrice)}
        </ViewDetailsField>
        <ViewDetailsField label="Gas Limit">
          {gasInfo.gasLimit?.toNumber() || null} gas
        </ViewDetailsField>
        {transaction?.type === 2 ? (
          <>
            <ViewDetailsField label="Base fee per gas">
              {formatEthValue(gasInfo.baseFeePerGas)}
            </ViewDetailsField>
            <ViewDetailsField label={`Max priority fee per gas (${priority} priority)`}>
              {formatEthValue(gasInfo.maxPriorityFeePerGas)}
            </ViewDetailsField>
            <ViewDetailsField label="Max transaction cost">
              {formatEthValue(gasInfo.maxFeeAndGasCost)}
            </ViewDetailsField>
          </>
        ) : (
          <>
            <ViewDetailsField label="Gas price">
              {formatEthValue(transaction.gasPrice)}
            </ViewDetailsField>
            <ViewDetailsField label="Estimated fee">
              {formatEthValue(gasInfo.estimatedGas.mul(transaction.gasPrice as BigNumber))}
              {!BigNumber.from(transaction.gasLimit).eq(gasInfo.estimatedGas) &&
                `(max: ${formatEthValue(
                  gasInfo.estimatedGas.mul(transaction.gasLimit as BigNumber)
                )})`}
            </ViewDetailsField>
          </>
        )}
      </div>
      <Button onClick={onClose}>Close</Button>
    </ViewDetailsContainer>
  )
}

export const ViewDetailsEth = () => {
  const { isOpen, open, close } = useOpenClose()
  const { hasError, isAnalysing } = useEthSignTransactionRequest()

  return (
    <>
      <ViewDetailsButton
        onClick={open}
        hide={isOpen}
        isAnalysing={isAnalysing}
        hasError={hasError}
      />
      <Drawer anchor="bottom" open={isOpen && !isAnalysing} onClose={close}>
        <ViewDetailsContent onClose={close} />
      </Drawer>
    </>
  )
}
