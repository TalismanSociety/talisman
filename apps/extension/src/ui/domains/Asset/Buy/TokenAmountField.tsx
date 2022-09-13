import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { ChevronRightIcon } from "@talisman/theme/icons"
import { useEffect, useState } from "react"
import styled from "styled-components"

import { TokenPickerModal } from "./TokenPickerModal"

// .attrs((props: { noValue?: boolean; noToken?: boolean }) => ({
//   noValue: !!props.noValue,
// }))
//color: ${({ noValue }) => (noValue ? "var(--color-background-muted-2x)" : "var(--color-mid)")};
const Amount = styled.div`
  background: var(--color-background-muted-3x);
  border-radius: var(--border-radius-tiny);
  height: 7.2rem;
  padding: 1.6rem;
  display: flex;
  align-items: center;

  span,
  input {
    color: var(--color-mid);
    font-size: var(--font-size-xlarge);
    line-height: var(--font-size-xlarge);
  }

  // hide input number buttons
  /* Chrome, Safari, Edge, Opera */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  /* Firefox */
  input[type="number"] {
    -moz-appearance: textfield;
  }

  input {
    min-width: 0; // workaround user agent
    background: none;
    /* ::placeholder {
      color: var(--color-background-muted-2x);
    } */
    color: var(--color-mid);
    border: none;
  }

  button {
    height: 4rem;
    border: none;
    border-radius: var(--border-radius-tiny);
    background-color: #333333;
    background-color: rgba(var(--color-primary-raw), 0.1);
    cursor: pointer;
    outline: none;
    font-size: var(--font-size-small);
    color: var(--color-primary);
    svg {
      font-size: var(--font-size-normal);
    }
    padding: 0.8rem;
    white-space: nowrap;
    display: flex;
    align-items: center;
    opacity: 0.9;
    :hover {
      opacity: 1;
    }
  }
`

type TokenAmountFieldProps = {
  fieldProps: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
} & {
  prefix?: string
  defaultSymbol?: string
  onTokenChanged?: (symbol: string) => void
}

export const TokenAmountField = ({
  prefix,
  defaultSymbol,
  onTokenChanged,
  fieldProps,
}: TokenAmountFieldProps) => {
  const { open, isOpen, close } = useOpenClose()
  const [symbol, setSymbol] = useState(defaultSymbol)

  useEffect(() => {
    if (onTokenChanged && symbol) onTokenChanged(symbol)
  }, [onTokenChanged, symbol])

  return (
    <>
      <Amount>
        {!!prefix && <span>{prefix}</span>}
        <input type="number" placeholder="100" autoComplete="off" {...fieldProps} />
        <button type="button" onClick={open}>
          Choose Token <ChevronRightIcon />
        </button>
      </Amount>
      <TokenPickerModal isOpen={isOpen} close={close} />
    </>
  )
}
