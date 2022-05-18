import styled from "styled-components"
import Item, { IItemProps } from "./Item"

interface IProps {
  className?: string
  items: IItemProps[]
}

const Container = ({ className, items }: IProps) => {
  return (
    <div className={`${className} notification-container`}>
      {items.map((item) => {
        return item.type !== "SINGLETON" && <Item key={item?.id} {...item} />
      })}
    </div>
  )
}

const StyledContainer = styled(Container)`
  position: fixed;
  top: 1rem;
  right: 1rem;

  > .notification-item {
    margin-bottom: 1rem;
  }
`

export default StyledContainer
