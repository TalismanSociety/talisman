import React from "react"
import styled from "styled-components"

const Pill = styled(({ children, className, onClick }) => (
  <span className={`pill ${className}`} onClick={onClick}>
    {React.Children.map(children, (child) =>
      typeof child === "string" ? <span>{child}</span> : child
    )}
  </span>
))`
  transition: all 0.2s;
  line-height: 1em;
  padding: 0.5em 0.8em;
  display: inline-flex;
  align-items: center;
  border-radius: 4rem;
  user-select: none;
  background: rgb(${({ theme }) => theme?.foreground});
  color: rgb(${({ theme }) => theme?.background});
  box-shadow: 0 0 0.8rem rgba(0, 0, 0, 0.1);
  font-size: var(--font-size-normal);

  > * {
    line-height: 1em;
  }

  > * {
    transition: all var(--transition-speed-fast) ease-in;
    margin: 0 0.2em;
  }

  ${({ onClick }) =>
    !!onClick &&
    `
      cursor: pointer;
    `}

  ${({ large }) =>
    large &&
    `
      font-size: var(--font-size-medium);
      padding: 0.6em 1em;
    `}
    
  ${({ small }) =>
    small &&
    `
      font-size: var(--font-size-small);
      padding: 0.4em 0.6em;
    `}

  ${({ primary, theme, onClick }) =>
    !!primary &&
    `
      background: rgb(${theme?.primary});
      color: rgb(${theme?.background});
      box-shadow: none;
      ${
        !!onClick &&
        `
        &:hover{
          background: rgb(${theme?.primary});
          color: rgb(${theme?.background});
        }
      `
      }
  `}

  ${({ active, theme }) =>
    !!active &&
    `
      background: rgb(${theme?.primary});
      color: rgb(${theme?.background});
      box-shadow: none;
    `}

    ${({ muted }) =>
    !!muted &&
    `
      opacity: 0.3
    `}
`

export default Pill
