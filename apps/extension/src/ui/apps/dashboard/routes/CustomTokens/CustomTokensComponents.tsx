import { CustomErc20TokenCreate } from "@core/domains/tokens/types"
import { LoaderIcon } from "@talisman/theme/icons"
import unknownToken from "@talisman/theme/icons/custom-token-generic.svg?url"
import styled, { css } from "styled-components"

export const commonFormStyle = css`
  margin: 4.2rem 0;
  display: flex;
  flex-direction: column;
  gap: 2.4rem;

  .field-header + .children {
    margin-top: 0.8rem;
  }

  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input:disabled {
    cursor: not-allowed;
    color: var(--color-mid);
  }

  .field > .children .prefix,
  .field > .children .suffix {
    opacity: 1;
  }

  .field > .children {
    .prefix + input {
      padding-left: 5.4rem;
    }
  }
`

export const Split = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.4rem;
`

export const Footer = styled.div`
  display: flex;
  justify-content: flex-end;

  button {
    .btn-content {
      gap: 0.6rem;
      svg {
        font-size: 2rem;
      }
    }
  }
`

export const ErrorDiv = styled.div`
  color: var(--color-status-error);
`

export const LoadingSuffix = styled.div.attrs({ children: <LoaderIcon data-spin /> })`
  font-size: 3rem;
  position: relative;
  top: 2rem;
  left: 2rem;
`

export const SymbolPrefixContainer = styled.div`
  font-size: 3rem;
  position: relative;
  top: 2rem;
  img {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
  }
`

export const SymbolPrefix = ({ token }: { token?: CustomErc20TokenCreate }) => {
  if (!token) return null
  return (
    <SymbolPrefixContainer>
      <img src={token?.image ?? unknownToken} alt={token.symbol} />
    </SymbolPrefixContainer>
  )
}
