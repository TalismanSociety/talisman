import styled from "styled-components"

const Panel = ({ children, className, onClick }: any) => (
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
  <div className={`panel ${className}`} onClick={onClick}>
    {children}
  </div>
)

const StyledPanel = styled(Panel)`
  background: var(--color-background-muted);
  padding: var(--padding);
  border-radius: var(--border-radius);

  ${({ small }) =>
    small &&
    `
    padding: var(--padding-small);
  `}

  ${({ large }) =>
    large &&
    `
    padding: var(--padding-large);
  `}
`

export default StyledPanel
