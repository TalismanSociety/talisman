import { SubstrateLayout } from "../shared/SubstrateLayout"
import { NativeBalance } from "./NativeBalance"
import { SendBalance } from "./SendNative"

export const BalancesPage = () => {
  return (
    <SubstrateLayout title="Balances">
      <NativeBalance />
      <SendBalance />
    </SubstrateLayout>
  )
}
