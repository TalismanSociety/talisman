import { getEip1559TotalFees } from "@core/domains/ethereum/helpers"
import { EthPriorityOptionName, EthTransactionDetails } from "@core/domains/signing/types"
import { Drawer } from "@talisman/components/Drawer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { classNames } from "@talisman/util/classNames"
import { formatEtherValue } from "@talisman/util/formatEthValue"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { BigNumberish, ethers } from "ethers"
import { useCallback, useEffect } from "react"
import styled from "styled-components"

const PillButton = styled.button`
  background: var(--color-background-muted-3x);
  padding: 0.6rem 0.8rem;
  border-radius: 4.8rem;
  font-weight: var(--font-weight-regular);
  color: var(--color-mid);
  outline: none;
  border: none;
  cursor: pointer;
  transition: all var(--transition-speed-fast) ease-in;
  font-size: var(--font-size-tiny);
  line-height: var(--font-size-xsmall);

  :hover {
    background: var(--color-background-muted-3x);
    color: var(--color-foreground-muted-2x);
  }
`

const Container = styled.div`
  background: var(--color-background-muted-3x);
  border-radius: 2.4rem;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  font-size: 1.4rem;
  font-weight: 500;
  color: var(--color-mid);
  padding: 2.4rem;

  h3 {
    color: var(--color-foreground);
    font-weight: 600;
    font-size: 1.6rem;
    line-height: 2.2rem;
    text-align: center;
    margin-bottom: 2.4rem;
  }
  .subtitles {
    display: flex;
    width: 100%;
    justify-content: space-between;
    margin-bottom: 1.6rem;
  }
`

const OPTIONS: Record<EthPriorityOptionName, { icon: string; label: string }> = {
  low: { icon: "🚗", label: "Low" },
  medium: { icon: "🚅", label: "Medium" },
  high: { icon: "🚀", label: "High" },
}

const OptionButton = styled.button`
  display: flex;
  width: 100%;
  border-radius: 0.8rem;
  padding: 1.2rem;
  align-items: center;
  margin-top: 0.8rem;
  background: #2f2f2f;
  border: none;
  outline: none;
  font-weight: 600;
  height: 5.6rem;
  text-align: left;
  gap: 0.8rem;
  cursor: pointer;
  color: var(--color-mid);

  .icon {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    width: 3.2rem;
    height: 3.2rem;
    line-height: 1.2rem;
    display: flex;
    justify-content: center;
    flex-direction: column;
    text-align: center;
  }

  .grow {
    flex-grow: 1;
  }

  &.selected,
  :hover {
    background: #383838;
    color: var(--color-foreground);
  }
`

type EthFeeButtonProps = {
  transaction: ethers.providers.TransactionRequest
  txDetails: EthTransactionDetails
  // estimatedGas: BigNumber
  // gasPrice: BigNumber
  // baseFeePerGas: BigNumber
  // priorityOptions: EthPriorityOptions
  priority: EthPriorityOptionName
  selected?: boolean
  decimals: number
  symbol?: string
  onClick?: () => void
}

const PriorityOption = ({
  txDetails,
  transaction,
  // gasPrice,
  // baseFeePerGas,
  // estimatedGas,
  priority,
  // priorityOptions,
  selected,
  decimals,
  symbol,
  onClick,
}: EthFeeButtonProps) => {
  const { estimatedFee } = getEip1559TotalFees(
    txDetails.estimatedGas,
    transaction.gasLimit as BigNumberish,
    txDetails.baseFeePerGas as BigNumberish,
    txDetails.priorityOptions?.[priority] as BigNumberish
  )
  // TODO extraire méthode avec estim + max, utiliser estim
  // const { maxFeeAndGasCost } = getTransactionFeeParams(
  //   gasPrice,
  //   estimatedGas,
  //   baseFeePerGas,
  //   priorityOptions?.[priority]
  // )
  return (
    <OptionButton onClick={onClick} type="button" className={classNames(selected && "selected")}>
      <div className="icon">{OPTIONS[priority].icon}</div>
      <div className="grow">{OPTIONS[priority].label}</div>
      <div>{formatEtherValue(estimatedFee, decimals, symbol)}</div>
    </OptionButton>
  )
}

const OpenFeeSelectTracker = () => {
  const { genericEvent } = useAnalytics()

  useEffect(() => {
    genericEvent("open evm fee select")
  }, [genericEvent])

  return null
}

type EthFeeSelectProps = {
  transaction: ethers.providers.TransactionRequest
  txDetails: EthTransactionDetails
  priority: EthPriorityOptionName
  decimals: number
  symbol?: string
  onChange?: (priority: EthPriorityOptionName) => void
  drawerContainer?: HTMLElement | null
}

export const EthFeeSelect = ({
  transaction,
  txDetails,
  onChange,
  priority,
  drawerContainer,
  ...props
}: EthFeeSelectProps) => {
  const { genericEvent } = useAnalytics()

  const { isOpen, open, close } = useOpenClose()
  const handleSelect = useCallback(
    (priority: EthPriorityOptionName) => () => {
      genericEvent("evm fee change", { priority })
      if (onChange) onChange(priority)
      close()
    },
    [close, onChange, genericEvent]
  )

  // this is only usefull with EIP-1559
  if (!txDetails.priorityOptions || transaction?.type !== 2) return null

  return (
    <>
      <PillButton type="button" onClick={open}>
        {OPTIONS[priority].icon} {OPTIONS[priority].label}
      </PillButton>
      <Drawer parent={drawerContainer} open={isOpen} anchor="bottom" onClose={close}>
        <Container>
          <h3>Fee Options</h3>
          <div className="subtitles">
            <div>Priority</div>
            <div>Max transaction fee</div>
          </div>
          <PriorityOption
            transaction={transaction}
            txDetails={txDetails}
            {...props}
            priority={"low"}
            onClick={handleSelect("low")}
            selected={priority === "low"}
          />
          <PriorityOption
            transaction={transaction}
            txDetails={txDetails}
            {...props}
            priority={"medium"}
            onClick={handleSelect("medium")}
            selected={priority === "medium"}
          />
          <PriorityOption
            transaction={transaction}
            txDetails={txDetails}
            {...props}
            priority={"high"}
            onClick={handleSelect("high")}
            selected={priority === "high"}
          />
          <OpenFeeSelectTracker />
        </Container>
      </Drawer>
    </>
  )
}
