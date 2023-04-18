// @ts-nocheck
import { ReactNode } from "react"
import styled, { CSSProperties } from "styled-components"

interface IProps {
  columns: number
  gap: CSSProperties["gap"]
  itemHeight?: number
  className?: string
  children?: ReactNode
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
  grid-gap: ${({ gap }) => gap};
  width: 100%;
  grid-template-columns: repeat(${({ columns }) => columns}, 1fr);

  > * {
    ${({ itemHeight }) => !!itemHeight && `height: ${itemHeight}`}
  }
`

StyledGrid.defaultProps = defaultProps

export default StyledGrid
