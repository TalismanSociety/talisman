import { EthereumLayout } from "../shared/EthereumLayout"
import { NetworkSwitch } from "./NetworkSwitch"

export const BehaviorPage = () => {
  return (
    <EthereumLayout title="Behavior">
      <NetworkSwitch />
    </EthereumLayout>
  )
}
