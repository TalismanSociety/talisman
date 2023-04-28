import { SubstrateLayout } from "../shared/SubstrateLayout"
import { NativeBalance } from "./NativeBalance"

export const BalancesPage = () => {
  return (
    <SubstrateLayout title="Balances">
      <NativeBalance />
    </SubstrateLayout>
  )
}
