import styled from "styled-components"
import { useDashboard } from "../context"

const Container = styled.div``

export const AccountPicker = () => {
  const { accountId, setAccountId } = useDashboard()

  return <Container></Container>
}
