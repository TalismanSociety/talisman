// canonical Permit2 deployment, at the same address on every chain
export const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3"

export const abiPermit2 = [
  "struct PermitDetails { address token; uint160 amount; uint48 expiration; uint48 nonce; }",
  "struct PermitSingle { PermitDetails details; address spender; uint256 sigDeadline; }",
  "struct PermitBatch { PermitDetails[] details; address spender; uint256 sigDeadline; }",

  "function approve(address token, address spender, uint160 amount, uint48 expiration) external",
  "function permit(address owner, PermitSingle permitSingle, bytes signature) external",
  "function permit(address owner, PermitBatch permitBatch, bytes signature) external",
  "function transferFrom(address from, address to, uint160 amount, address token) external",
  "function invalidateNonces(address token, address spender, uint48 newNonce) external",
  "function allowance(address user, address token, address spender) external view returns (uint160 amount, uint48 expiration, uint48 nonce)",
] as const
