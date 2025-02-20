import { parseAbi } from "viem"

export const erc20BalancesAggregatorAbi = parseAbi([
  "struct AccountToken {address account; address token;}",
  "function balances(AccountToken[] memory accountTokens) public view returns (uint256[] memory)",
] as const)
