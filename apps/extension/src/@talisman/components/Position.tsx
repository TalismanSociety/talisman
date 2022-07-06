import styled from "styled-components"

interface IProps {
  center?: boolean
  bottom?: boolean
  loose?: boolean
  children?: any
  className?: string
}

const Position = ({ children, className }: IProps) => (
  <div className={className}>
    <div className="inner">{children}</div>
  </div>
)

export default styled(Position)`
  display: flex;
  width: 100%;
  height: 100%;
  align-items: ${({ center, bottom }) => (bottom ? "flex-end" : center ? "center" : "flex-start")};

  > .inner {
    display: block;
    width: 100%;
    padding: ${({ loose }) => (loose ? "9vw" : "0")} 0;
    margin: 0 ${({ loose }) => (loose ? "11vw" : "0")};
  }
`
