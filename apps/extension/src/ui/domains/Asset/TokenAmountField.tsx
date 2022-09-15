import { Token } from "@core/domains/tokens/types"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { ChevronRightIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import useToken from "@ui/hooks/useToken"
import { useCallback } from "react"
import styled from "styled-components"

import { TokenLogo } from "./TokenLogo"
import { TokenPickerModal } from "./TokenPickerModal"

const Amount = styled.div`
  background: var(--color-background-muted-3x);
  border-radius: var(--border-radius-tiny);
  height: 7.2rem;
  padding: 1.6rem;
  display: flex;
  flex-direction: row-reverse; // l33t trick to make the prefix color change possible
  align-items: center;

  span,
  input {
    font-size: var(--font-size-xlarge);
    line-height: var(--font-size-xlarge);
  }

  span.prefix {
    color: var(--color-background-muted-2x);
  }
  input:not(:placeholder-shown) + span.prefix {
    color: var(--color-mid);
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
    opacity: 0.8;
    :hover {
      opacity: 1;
    }
  }
  button.token {
    background-color: #333333;
    color: var(--color-mid);
    font-size: var(--font-size-normal);
    gap: 0.8rem;
    div {
      width: 2.4rem;
      height: 2.4rem;
    }
  }
`

type TokenAmountFieldProps = {
  fieldProps: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
} & {
  prefix?: string
  tokenId?: string
  onTokenChanged?: (tokenId: string) => void
  tokensFilter?: (token: Token) => boolean
}

/*
  amount is uncontrolled
  tokenId is controlled so it can be changed by parent
**/
export const TokenAmountField = ({
  prefix,
  tokenId,
  onTokenChanged,
  fieldProps,
  tokensFilter,
}: TokenAmountFieldProps) => {
  const { open, isOpen, close } = useOpenClose()
  const token = useToken(tokenId)

  const handleTokenSelect = useCallback(
    (id: string) => {
      onTokenChanged?.(id)
      close()
    },
    [close, onTokenChanged]
  )

  return (
    <>
      <Amount>
        {/* CSS trick here we need prefix to be after input to have a valid CSS rule for prefix color change base on input beeing empty
        items will be displayed in reverse order to make this workaround possible */}
        <button type="button" onClick={open} className={classNames(token && "token")}>
          {token ? (
            <>
              <TokenLogo tokenId={tokenId} /> {token.symbol}
            </>
          ) : (
            <>
              Choose Token <ChevronRightIcon />
            </>
          )}
        </button>
        <input type="number" placeholder="100" autoComplete="off" {...fieldProps} />
        {!!prefix && <span className="prefix">{prefix}</span>}
      </Amount>
      <TokenPickerModal
        isOpen={isOpen}
        close={close}
        filter={tokensFilter}
        onTokenSelect={handleTokenSelect}
      />
    </>
  )
}
