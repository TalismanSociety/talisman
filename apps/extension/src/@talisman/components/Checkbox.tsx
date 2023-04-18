import { classNames } from "@talismn/util"
import React from "react"
import styled from "styled-components"

const CheckboxContainer = styled.label`
  display: inline-flex;
  :not(:disabled) {
    cursor: pointer;
  }

  // Hide checkbox visually but remain accessible to screen readers.
  // Source: https://polished.js.org/docs/#hidevisually
  input {
    border: 0;
    clip: rect(0 0 0 0);
    clippath: inset(50%);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }

  span {
    // line size should be same as checkbox size
    line-height: 1.25em;
  }

  .square {
    // checkbox size should be relative to current font size
    width: 1.25em;
    min-width: 1.25em;
    height: 1.25em;
    min-height: 1.25em;
    margin-right: 0.5em;
    display: inline-flex;
    flex-direction: column;
    justify-content: top;
    background: var(--color-background-muted-2x);
    border: 0.1rem solid rgba(var(--color-primary-raw), 0);
    border-radius: 0.4rem;
    transition: all var(--transition-speed) ease-in-out;

    svg {
      transition: opacity var(--transition-speed) ease-in-out;
      opacity: 0;
      width: 100%;
      height: 100%;
      fill: none;
      stroke: var(--color-primary);
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  }

  input:enabled:hover:not(:checked) + span span {
    //border: 0.1rem solid rgba(var(--color-primary-raw), 0.25);
    svg {
      opacity: 0.1;
    }
  }
  input:enabled:focus + span span {
    border: 0.1rem solid rgba(var(--color-primary-raw), 0.4);
  }
  input:enabled:active + span span {
    border: 0.1rem solid rgba(var(--color-primary-raw), 0.6);
  }

  input:checked + span span {
    svg {
      opacity: 1;
    }
  }
`

type Props = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>

export const Checkbox = React.forwardRef<HTMLInputElement, Props>(
  ({ className, children, ...props }, ref) => (
    <CheckboxContainer className={classNames("checkbox", className)}>
      <input ref={ref} type="checkbox" {...props} />
      <span>
        <span className="square">
          <svg viewBox="0 0 15 14">
            <path d="M12.1668 3.5L5.75016 9.91667L2.8335 7" />
          </svg>
        </span>
      </span>
      {children && <span>{children}</span>}
    </CheckboxContainer>
  )
)
Checkbox.displayName = "Checkbox"
