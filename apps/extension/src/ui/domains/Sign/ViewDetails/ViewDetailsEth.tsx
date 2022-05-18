import { FC, useCallback, useMemo } from "react"
import styled from "styled-components"
import Button from "@talisman/components/Button"
import { Drawer } from "@talisman/components/Drawer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { ViewDetailsButton } from "./ViewDetailsButton"
import { ViewDetailsField } from "./ViewDetailsField"
import { useEthSignRequest } from "../SignRequestContext"
import { formatEther } from "ethers/lib/utils"
import { BigNumberish } from "ethers"

const ViewDetailsContainer = styled.div`
  background: var(--color-background);
  padding: 2.4rem;
  border-radius: 2.4rem 2.4rem 0px 0px;
  font-size: var(--font-size-small);
  line-height: 2rem;
  display: flex;
  flex-direction: column;
  max-height: 48rem;

  .grow {
    flex-grow: 1;
    overflow-y: auto;
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

  a:hover {
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
  const { network } = useEthSignRequest()
  const blockExplorerUrl = useMemo(() => network?.explorerUrls?.[0], [network?.explorerUrls])

  if (!address) return null

  if (!blockExplorerUrl) return <>{address}</>

  return (
    <a href={`${blockExplorerUrl}/address/${address}`} target="_blank" rel="noreferrer">
      {address}
    </a>
  )
}

const ViewDetailsContent: FC<ViewDetailsContentProps> = ({ onClose }) => {
  const { request, network, gasInfo, priority } = useEthSignRequest()

  const formatEthValue = useCallback(
    (value?: BigNumberish) => {
      return value ? `${formatEther(value)} ${network?.nativeToken?.symbol ?? ""}` : null
    },
    [network?.nativeToken?.symbol]
  )

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
        <ViewDetailsField label="Network">{network?.name}</ViewDetailsField>
        <ViewDetailsField label="Network usage">
          {Math.round((gasInfo?.gasUsedRatio ?? 0) * 100)}%
        </ViewDetailsField>
        <ViewDetailsField label="Estimated gas &amp; price per gas">
          {gasInfo?.estimatedGas?.toNumber() || null} gas at {formatEthValue(gasInfo?.gasPrice)}
        </ViewDetailsField>
        <ViewDetailsField label="Total gas cost">
          {formatEthValue(gasInfo?.estimatedGas?.mul(gasInfo.gasPrice))}
        </ViewDetailsField>
        <ViewDetailsField label={`Max fee (${priority} priority)`}>
          {formatEthValue(gasInfo?.maxFee)}
        </ViewDetailsField>
        <ViewDetailsField label="Max transaction cost">
          {formatEthValue(gasInfo?.maxFeeAndGasCost)}
        </ViewDetailsField>
      </div>
      <Button onClick={onClose}>Close</Button>
    </ViewDetailsContainer>
  )
}

export const ViewDetailsEth = () => {
  const { isOpen, open, close } = useOpenClose()
  const { hasError, isAnalysing } = useEthSignRequest()

  return (
    <>
      <ViewDetailsButton onClick={open} hide={isOpen} isAnalysing={isAnalysing} hasError={hasError}>
        View Details
      </ViewDetailsButton>
      <Drawer anchor="bottom" open={isOpen && !isAnalysing} onClose={close}>
        <ViewDetailsContent onClose={close} />
      </Drawer>
    </>
  )
}
