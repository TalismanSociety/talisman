import styled from "styled-components"

interface IProps {
  large?: boolean
  small?: boolean
  line?: boolean
  className?: string
}

const Spacer = ({ className }: IProps) => <div className={className} />

export default styled(Spacer)`
  height: 0;
  position: relative;

  padding: ${({ large, small }) => (large ? "3.2rem" : small ? "1.6rem" : "2.4rem")} 0;

  ${({ line, theme }) =>
    !!line &&
    `
    &:after{
      content: '';
      width: 100%;
      height: 1px;
      background: rgba(${theme.foreground}, 0.2);
      position: absolute;
      top: 50%;
      left: 0
    }

  `}
`
