import styled from "styled-components"

interface IProps {
  vertical?: boolean
  className?: string
}

const Spacer = ({ className }: IProps) => <div className={className} />

export default styled(Spacer)`
  position: relative;
  display: block;
  opacity: 0.5;
  background: var(--color-mid);
  height: 1px;
  width: 100%;
  margin: 1em 0;

  ${({ vertical }) =>
    !!vertical &&
    `
    display: inline-block;
    height: 1em;
    width: 1px;
    margin: 0 1em;
  `}
`
