import { useNavigate } from "react-router-dom"
import Layout, { Header, Content, Footer } from "../Layout"
import Button from "@talisman/components/Button"
import Transaction from "@ui/domains/Transaction"
import { useAnalyticsPopupOpen } from "@ui/hooks/useAnalyticsPopupOpen"

const Detail = ({ id }: any) => {
  useAnalyticsPopupOpen("transaction")

  const navigate = useNavigate()

  // TODO : this page doesn't seem to be displayed atm
  // shouldn't the close button call window.close() ?

  return (
    <Layout>
      <Header />
      <Content>
        <Transaction.Status id={id} />
      </Content>
      <Footer>
        <Transaction.Link prefix="Included in block:" id={id} />
        <Button onClick={() => navigate("/")}>Close</Button>
      </Footer>
    </Layout>
  )
}

export default Detail
