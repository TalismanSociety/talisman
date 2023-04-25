import { EthereumLayout } from "../shared/EthereumLayout"
import { ArbitraryTransaction } from "./ArbitraryTransaction"

export const TransferPage = () => {
  return (
    <EthereumLayout title="Transaction">
      <ArbitraryTransaction />
    </EthereumLayout>
  )
}
