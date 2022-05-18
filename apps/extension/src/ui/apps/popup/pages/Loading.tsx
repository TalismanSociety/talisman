import styled from "styled-components"
import Layout, { Content } from "../Layout"
import StatusIcon from "@talisman/components/StatusIcon"

interface IProps {
  text?: string
  className?: string
}

const Status = ({ text, className }: IProps) => (
  <Layout className={className}>
    <Content>
      <StatusIcon subtitle={"loading"} />
    </Content>
  </Layout>
)

const StyledStatus = styled(Status)`
  .layout-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
`

export default StyledStatus
