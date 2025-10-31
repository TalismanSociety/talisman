import { useWithdrawFundsContext } from "../WithdrawFundsProvider"
import { EthFeeSettingsRow } from "./EthFeeSettingsRow"

export const TransactionPriorityRow = () => {
  const { network, transaction } = useWithdrawFundsContext()

  if (!network || !transaction) return null

  // Route to network-specific fee settings components
  switch (network.platform) {
    case "ethereum":
      return <EthFeeSettingsRow />
    case "polkadot":
      return null
    case "solana":
      return null
    default:
      return null
  }
}
