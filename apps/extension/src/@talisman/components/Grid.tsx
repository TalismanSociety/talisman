// @ts-nocheck
import styled from "styled-components"

interface IProps {
  columns: number
  gap: any
  itemHeight?: number
  className?: string
  children?: any
}

const defaultProps: IProps = {
  columns: 2,
  gap: "2.4rem",
  itemHeight: "auto",
}

const Grid = ({ className, children }: IProps) => (
  <div className={`grid ${className}`}>{children}</div>
)

Grid.defaultProps = defaultProps

const StyledGrid = styled(Grid)`
  display: grid;
  grid-gap: ${({ gap, ...rest }) => gap};
  width: 100%;
  grid-template-columns: repeat(${({ columns }) => columns}, 1fr);

  > * {
    ${({ itemHeight }) => !!itemHeight && `height: ${itemHeight}`}
  }
`

StyledGrid.defaultProps = defaultProps

export default StyledGrid
