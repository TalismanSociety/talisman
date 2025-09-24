import { useDepositFunds } from "../useDepositFunds"
import { ApyRow } from "./ApyRow"
import { Container } from "./Container"
import { ProtocolRow } from "./ProtocolRow"

export const ProductSummary = () => {
  const { product } = useDepositFunds()

  if (!product) return null

  return (
    <Container className="space-y-4 px-8 py-4">
      <ApyRow />
      <ProtocolRow />
    </Container>
  )
}
