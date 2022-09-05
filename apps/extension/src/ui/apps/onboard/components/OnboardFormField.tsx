import { classNames } from "@talisman/util/classNames"
import { ReactNode } from "react"
import { FieldError } from "react-hook-form"
import styled from "styled-components"

type OnboardFormFieldProps = {
  error?: FieldError
  children: ReactNode
}

const Container = styled.div`
  input,
  select,
  textarea {
    background: rgba(var(--color-foreground-raw), 0.05);
    display: block;
    border: none;
    border-radius: var(--border-radius-small);
    color: var(--color-foreground);
    padding: 0.8rem 2.4rem;
    width: 100%;

    :hover {
      background: rgba(var(--color-foreground-raw), 0.1);
    }
    :focus {
      background: rgba(var(--color-foreground-raw), 0.2);
    }
  }

  .message {
    padding-top: 0.4rem;
    font-size: var(--font-size-small);
    line-height: var(--font-size-small);
    height: var(--font-size-large);
    text-align: right;
    color: var(--color-status-warning);
  }
`

export const OnboardFormField = ({ children, error }: OnboardFormFieldProps) => {
  return (
    <Container>
      {children}
      <div className={"message"}>{error?.message ?? ""}</div>
    </Container>
  )
}
