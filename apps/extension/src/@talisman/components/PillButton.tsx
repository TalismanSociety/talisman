import styled from "styled-components"

export const PillButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background-color: #383838; //var(--color-background-muted-3x);
  padding: 0.6rem 0.8rem;
  border-radius: 4.8rem;
  font-weight: var(--font-weight-regular);
  color: var(--color-mid);
  outline: none;
  border: none;
  cursor: pointer;
  transition: all var(--transition-speed-fast) ease-in-out;
  font-size: var(--font-size-xsmall);
  line-height: var(--font-size-normal);

  svg {
    font-size: var(--font-size-small);
  }

  :hover {
    background-color: var(--color-background-muted-2x);
    color: var(--color-foreground-muted-2x);
  }
`
