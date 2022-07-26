import Button from "@talisman/components/Button"
import Transaction from "@ui/domains/Transaction"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

import Layout, { Content, Footer, Header } from "../Layout"

const Detail = ({ id }: any) => {
  const navigate = useNavigate()
  const { popupOpenEvent } = useAnalytics()

  useEffect(() => {
    popupOpenEvent("transaction")
  }, [popupOpenEvent])

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
